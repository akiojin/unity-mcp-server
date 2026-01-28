import { spawn } from 'child_process';
import { logger } from '../core/config.js';
import { CSharpLspUtils } from './CSharpLspUtils.js';

const sharedState = {
  proc: null,
  starting: null
};

export class LspProcessManager {
  constructor(options = {}) {
    const useShared = options.shared !== false;
    this.state = useShared ? sharedState : { proc: null, starting: null };
    this.utils = new CSharpLspUtils();
  }

  async ensureStarted() {
    if (this.state.proc && !this.state.proc.killed) return this.state.proc;
    if (this.state.starting) return this.state.starting;
    this.state.starting = (async () => {
      try {
        const rid = this.utils.detectRid();
        const bin = await this.utils.ensureLocal(rid);
        const proc = spawn(bin, { stdio: ['pipe', 'pipe', 'pipe'] });
        proc.on('error', e => logger.error(`[unity-mcp-server:lsp] process error: ${e.message}`));
        proc.on('close', (code, sig) => {
          logger.warning(`[unity-mcp-server:lsp] exited code=${code} signal=${sig || ''}`);
          if (this.state.proc === proc) {
            this.state.proc = null;
          }
        });
        proc.stderr.on('data', d => {
          const s = String(d || '').trim();
          if (s) logger.debug(`[unity-mcp-server:lsp] ${s}`);
        });
        this.state.proc = proc;
        logger.info(`[unity-mcp-server:lsp] started (pid=${proc.pid})`);
        return proc;
      } catch (e) {
        logger.error(`[unity-mcp-server:lsp] failed to start: ${e.message}`);
        throw e;
      }
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

    // Remove all listeners to prevent memory leaks
    try {
      if (p.stdout) p.stdout.removeAllListeners();
      if (p.stderr) p.stderr.removeAllListeners();
      p.removeAllListeners('error');
      p.removeAllListeners('close');
    } catch {}

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
