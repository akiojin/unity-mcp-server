import { LspProcessManager } from './LspProcessManager.js';
import { config, logger } from '../core/config.js';

export class LspRpcClient {
  constructor(projectRoot = null, manager = null) {
    this.mgr = manager || new LspProcessManager();
    this.proc = null;
    this.seq = 1;
    this.pending = new Map();
    this.buf = Buffer.alloc(0);
    this.initialized = false;
    this.projectRoot = projectRoot;
    this.boundOnData = null;
  }

  async ensure(attempt = 1) {
    if (this.#isProcessUsable(this.proc)) {
      return this.proc;
    }

    if (this.proc && !this.#isProcessUsable(this.proc)) {
      logger.warning('[unity-mcp-server:lsp] cached process stdin not writable, restarting');
      await this.#restartProcess(this.proc);
    }

    const proc = await this.mgr.ensureStarted();
    this.proc = proc;

    if (!this.#isProcessUsable(proc)) {
      if (attempt === 1) {
        logger.warning('[unity-mcp-server:lsp] started process has non-writable stdin, retrying');
        await this.#restartProcess(proc);
        return await this.ensure(attempt + 1);
      }
      throw new Error('LSP stdin not writable');
    }

    // Attach data handler once per process
    if (this.boundOnData) {
      try {
        proc.stdout.off('data', this.boundOnData);
      } catch {}
    }
    this.boundOnData = chunk => this.onData(chunk);
    proc.stdout.on('data', this.boundOnData);

    // On process close: reject all pending and reset state
    proc.on('close', () => {
      for (const [id, p] of Array.from(this.pending.entries())) {
        try {
          p.reject(new Error('LSP process exited'));
        } catch {}
        this.pending.delete(id);
      }
      this.initialized = false;
      this.proc = null;
    });

    if (!this.initialized) {
      try {
        await this.initialize();
      } catch (e) {
        const msg = String((e && e.message) || e);
        if (attempt === 1 && this.#isRecoverableMessage(msg)) {
          logger.warning(
            `[unity-mcp-server:lsp] initialize recoverable error: ${msg}. Restarting once...`
          );
          await this.#restartProcess(proc);
          return await this.ensure(attempt + 1);
        }
        throw e;
      }
    }

    return proc;
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

  async request(method, params, options = {}) {
    return await this.#requestWithRetry(method, params, 1, options);
  }

  async validateText(relative, newText) {
    const timeoutMs = Number.isFinite(config.lsp?.validationTimeoutMs)
      ? config.lsp.validationTimeoutMs
      : undefined;
    const resp = await this.request(
      'mcp/validateTextEdits',
      { relative, newText },
      { timeoutMs }
    );
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

  async #requestWithRetry(method, params, attempt, options) {
    let id = null;
    let timeoutHandle = null;
    const configuredTimeout = config.lsp?.requestTimeoutMs || 60000;
    const overrideTimeout = options?.timeoutMs;
    const timeoutMs = Number.isFinite(overrideTimeout)
      ? Math.max(1000, Math.min(300000, overrideTimeout))
      : Math.max(1000, Math.min(300000, configuredTimeout));
    const startedAt = Date.now();
    try {
      await this.ensure();
      id = this.seq++;
      const p = new Promise((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        timeoutHandle = setTimeout(() => {
          if (this.pending.has(id)) {
            this.pending.delete(id);
            reject(new Error(`${method} timed out after ${timeoutMs} ms`));
          }
        }, timeoutMs);
      });
      this.writeMessage({ jsonrpc: '2.0', id, method, params });
      const response = await p;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      const elapsedMs = Date.now() - startedAt;
      const warnMs = Number.isFinite(config.lsp?.slowRequestWarnMs)
        ? config.lsp.slowRequestWarnMs
        : 2000;
      if (elapsedMs >= warnMs) {
        logger.warning(
          `[unity-mcp-server:lsp] slow request: ${method} ${elapsedMs}ms (attempt ${attempt})`
        );
      }
      return response;
    } catch (e) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (id !== null && this.pending.has(id)) {
        this.pending.delete(id);
      }
      const elapsedMs = Date.now() - startedAt;
      const warnMs = Number.isFinite(config.lsp?.slowRequestWarnMs)
        ? config.lsp.slowRequestWarnMs
        : 2000;
      if (elapsedMs >= warnMs) {
        logger.warning(
          `[unity-mcp-server:lsp] slow request (error): ${method} ${elapsedMs}ms (attempt ${attempt})`
        );
      }
      const msg = String((e && e.message) || e);
      const recoverable = this.#isRecoverableMessage(msg);
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
        return await this.#requestWithRetry(method, params, attempt + 1, options);
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
      throw new Error(`[${method}] failed: ${msg}. ${hint}`, { cause: e });
    }
  }

  #isProcessUsable(proc) {
    return Boolean(
      proc &&
        !proc.killed &&
        proc.stdin &&
        !proc.stdin.destroyed &&
        !proc.stdin.writableEnded &&
        typeof proc.stdin.write === 'function'
    );
  }

  #isRecoverableMessage(message) {
    return /timed out|LSP process exited|stdin not writable|process not available/i.test(message);
  }

  async #restartProcess(proc) {
    if (proc && this.boundOnData) {
      try {
        proc.stdout.off('data', this.boundOnData);
      } catch {}
    }
    try {
      await this.mgr.stop(0);
    } catch {}
    this.proc = null;
    this.initialized = false;
    this.buf = Buffer.alloc(0);
  }
}
