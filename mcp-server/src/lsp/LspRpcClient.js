import { LspProcessManager } from './LspProcessManager.js';

export class LspRpcClient {
  constructor() {
    this.mgr = new LspProcessManager();
    this.proc = null;
    this.seq = 1;
    this.pending = new Map();
    this.buf = Buffer.alloc(0);
    this.initialized = false;
  }

  async ensure() {
    if (this.proc && !this.proc.killed) return this.proc;
    this.proc = await this.mgr.ensureStarted();
    this.proc.stdout.on('data', (chunk) => this.onData(chunk));
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
      } catch { /* ignore */ }
    }
  }

  writeMessage(obj) {
    const json = JSON.stringify(obj);
    const payload = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
    this.proc.stdin.write(payload, 'utf8');
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
        rootUri: null,
        capabilities: {},
        workspaceFolders: null,
      }
    };
    const p = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('LSP init timeout')); } }, 10000);
    });
    this.writeMessage(req);
    const resp = await p; // ignore result contents for stub
    // send initialized notification
    this.writeMessage({ jsonrpc: '2.0', method: 'initialized', params: {} });
    this.initialized = true;
    return resp;
  }

  async request(method, params) {
    await this.ensure();
    const id = this.seq++;
    const p = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(method + ' timeout')); } }, 60000);
    });
    this.writeMessage({ jsonrpc: '2.0', id, method, params });
    return await p;
  }
}

