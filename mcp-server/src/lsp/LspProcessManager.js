import { spawn } from 'child_process';
import { logger } from '../core/config.js';
import { CSharpLspUtils } from './CSharpLspUtils.js';

export class LspProcessManager {
  constructor() {
    this.proc = null;
    this.starting = null;
    this.utils = new CSharpLspUtils();
  }

  async ensureStarted() {
    if (this.proc && !this.proc.killed) return this.proc;
    if (this.starting) return this.starting;
    this.starting = (async () => {
      const rid = this.utils.detectRid();
      const bin = await this.utils.ensureLocal(rid);
      const proc = spawn(bin, { stdio: ['pipe', 'pipe', 'pipe'] });
      proc.on('error', e => logger.error(`[csharp-lsp] process error: ${e.message}`));
      proc.on('close', (code, sig) => {
        logger.warn(`[csharp-lsp] exited code=${code} signal=${sig || ''}`);
        this.proc = null;
      });
      proc.stderr.on('data', d => {
        const s = String(d || '').trim();
        if (s) logger.debug(`[csharp-lsp] ${s}`);
      });
      this.proc = proc;
      logger.info(`[csharp-lsp] started (pid=${proc.pid})`);
      return proc;
    })();
    try {
      return await this.starting;
    } finally {
      this.starting = null;
    }
  }

  async stop(graceMs = 3000) {
    if (!this.proc || this.proc.killed) return;
    const p = this.proc;
    this.proc = null;
    try {
      // Send LSP shutdown/exit if possible
      const shutdown = obj => {
        try {
          const json = JSON.stringify(obj);
          const payload = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
          p.stdin.write(payload, 'utf8');
        } catch {}
      };
      shutdown({ jsonrpc: '2.0', id: 1, method: 'shutdown', params: {} });
      shutdown({ jsonrpc: '2.0', method: 'exit' });
      p.stdin.end();
    } catch {}
    await new Promise(resolve => {
      const to = setTimeout(
        () => {
          try {
            p.kill('SIGTERM');
          } catch {}
          setTimeout(() => {
            try {
              p.kill('SIGKILL');
            } catch {}
            resolve();
          }, 1000);
        },
        Math.max(0, graceMs)
      );
      p.on('close', () => {
        clearTimeout(to);
        resolve();
      });
    });
  }
}
