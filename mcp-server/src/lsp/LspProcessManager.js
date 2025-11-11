import { spawn } from 'child_process';
import { logger } from '../core/config.js';
import { CSharpLspUtils } from './CSharpLspUtils.js';

const sharedState = {
  proc: null,
  starting: null
};

export class LspProcessManager {
  constructor() {
    this.state = sharedState;
    this.utils = new CSharpLspUtils();
  }

  async ensureStarted() {
    if (this.state.proc && !this.state.proc.killed) return this.state.proc;
    if (this.state.starting) return this.state.starting;
    this.state.starting = (async () => {
      const rid = this.utils.detectRid();
      const bin = await this.utils.ensureLocal(rid);
      const proc = spawn(bin, { stdio: ['pipe', 'pipe', 'pipe'] });
      proc.on('error', e => logger.error(`[csharp-lsp] process error: ${e.message}`));
      proc.on('close', (code, sig) => {
        logger.warn(`[csharp-lsp] exited code=${code} signal=${sig || ''}`);
        if (this.state.proc === proc) {
          this.state.proc = null;
        }
      });
      proc.stderr.on('data', d => {
        const s = String(d || '').trim();
        if (s) logger.debug(`[csharp-lsp] ${s}`);
      });
      this.state.proc = proc;
      logger.info(`[csharp-lsp] started (pid=${proc.pid})`);
      return proc;
    })();
    try {
      return await this.state.starting;
    } finally {
      this.state.starting = null;
    }
  }

  async stop(graceMs = 3000) {
    if (!this.state.proc || this.state.proc.killed) return;
    const p = this.state.proc;
    this.state.proc = null;
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
