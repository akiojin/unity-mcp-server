import { LspProcessManager } from './LspProcessManager.js';
import { config, logger } from '../core/config.js';

export class LspRpcClient {
  constructor(projectRoot = null) {
    this.mgr = new LspProcessManager();
    this.proc = null;
    this.seq = 1;
    this.pending = new Map();
    this.buf = Buffer.alloc(0);
    this.initialized = false;
    this.projectRoot = projectRoot;
    this.boundOnData = null;
  }

  async ensure() {
    if (this.proc && !this.proc.killed) return this.proc;
    this.proc = await this.mgr.ensureStarted();
    // Attach data handler once per process
    if (this.boundOnData) {
      try {
        this.proc.stdout.off('data', this.boundOnData);
      } catch {}
    }
    this.boundOnData = chunk => this.onData(chunk);
    this.proc.stdout.on('data', this.boundOnData);
    // On process close: reject all pending and reset state
    this.proc.on('close', () => {
      for (const [id, p] of Array.from(this.pending.entries())) {
        try {
          p.reject(new Error('LSP process exited'));
        } catch {}
        this.pending.delete(id);
      }
      this.initialized = false;
      this.proc = null;
    });
    if (!this.initialized) await this.initialize();
    return this.proc;
  }

  onData(chunk) {
    this.buf = Buffer.concat([this.buf, Buffer.from(chunk)]);
    while (true) {
      const headerEnd = this.buf.indexOf('\r\n\r\n');
      if (headerEnd < 0) break;
      const header = this.buf.slice(0, headerEnd).toString('utf8');
      const m = header.match(/Content-Length:\s*(\d+)/i);
      const len = m ? parseInt(m[1], 10) : 0;
      const total = headerEnd + 4 + len;
      if (this.buf.length < total) break;
      const jsonBuf = this.buf.slice(headerEnd + 4, total);
      this.buf = this.buf.slice(total);
      try {
        const msg = JSON.parse(jsonBuf.toString('utf8'));
        if (msg.id && this.pending.has(msg.id)) {
          this.pending.get(msg.id).resolve(msg);
          this.pending.delete(msg.id);
        }
      } catch {
        /* ignore */
      }
    }
  }

  writeMessage(obj) {
    if (!this.proc || this.proc.killed) {
      throw new Error('LSP process not available');
    }
    // Check if stdin is still writable
    if (!this.proc.stdin || this.proc.stdin.destroyed || this.proc.stdin.writableEnded) {
      throw new Error('LSP stdin not writable');
    }
    const json = JSON.stringify(obj);
    const payload = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
    try {
      this.proc.stdin.write(payload, 'utf8');
    } catch (e) {
      logger.error(`[unity-mcp-server:lsp] writeMessage failed: ${e.message}`);
      // Mark process as unavailable to prevent further writes
      this.proc = null;
      this.initialized = false;
      throw e;
    }
  }

  async initialize() {
    await this.ensure();
    const id = this.seq++;
    const req = {
      jsonrpc: '2.0',
      id,
      method: 'initialize',
      params: {
        processId: process.pid,
        rootUri: this.projectRoot ? 'file://' + String(this.projectRoot).replace(/\\/g, '/') : null,
        capabilities: {},
        workspaceFolders: null
      }
    };
    const timeoutMs = Math.max(5000, Math.min(60000, config.lsp?.requestTimeoutMs || 60000));
    const p = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`initialize timed out after ${timeoutMs} ms`));
        }
      }, timeoutMs);
    });
    this.writeMessage(req);
    const resp = await p; // ignore result contents for stub
    // send initialized notification
    this.writeMessage({ jsonrpc: '2.0', method: 'initialized', params: {} });
    this.initialized = true;
    return resp;
  }

  async request(method, params) {
    return await this.#requestWithRetry(method, params, 1);
  }

  async validateText(relative, newText) {
    const resp = await this.request('mcp/validateTextEdits', { relative, newText });
    if (!resp) return [];
    const payload = resp.result ?? resp;
    const diagnostics = Array.isArray(payload?.diagnostics) ? payload.diagnostics : [];
    return diagnostics.map(d => ({
      severity: d?.severity,
      message: d?.message,
      id: d?.id,
      line: d?.line,
      column: d?.column
    }));
  }

  async #requestWithRetry(method, params, attempt) {
    await this.ensure();
    const id = this.seq++;
    const timeoutMs = Math.max(1000, Math.min(300000, config.lsp?.requestTimeoutMs || 60000));
    const p = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`${method} timed out after ${timeoutMs} ms`));
        }
      }, timeoutMs);
    });
    try {
      this.writeMessage({ jsonrpc: '2.0', id, method, params });
      return await p;
    } catch (e) {
      const msg = String((e && e.message) || e);
      const recoverable = /timed out|LSP process exited/i.test(msg);
      if (recoverable && attempt === 1) {
        // Auto-reinit and retry once with grace period for proper LSP shutdown
        try {
          await this.mgr.stop(3000);
        } catch {}
        this.proc = null;
        this.initialized = false;
        this.buf = Buffer.alloc(0);
        logger.warning(
          `[unity-mcp-server:lsp] recoverable error on ${method}: ${msg}. Retrying once...`
        );
        return await this.#requestWithRetry(method, params, attempt + 1);
      }
      // Standardize error message with actionable recovery instructions
      let hint;
      if (recoverable) {
        hint =
          'LSP failed to parse the file (likely syntax errors). ' +
          'Recovery options: (1) Use Bash tool with "cat > file << EOF" to rewrite the file, ' +
          '(2) Fix syntax errors manually in Unity Editor, ' +
          '(3) Check for unbalanced braces/brackets in the target file.';
      } else {
        hint = 'Check request parameters or increase lsp.requestTimeoutMs.';
      }
      throw new Error(`[${method}] failed: ${msg}. ${hint}`);
    }
  }
}
