import { logger } from './config.js';

export class WriteGate {
  constructor(unityConnection) {
    this.unity = unityConnection;
  }

  async ensureConnected() {
    if (this.unity.isConnected()) return;
    try {
      await this.unity.connect();
    } catch (e) {
      logger.warn(`[WriteGate] connect failed: ${e.message}`);
    }
  }

  async waitUntilIdle({ timeoutMs = 120000, pollMs = 500 } = {}) {
    const start = Date.now();
    await this.ensureConnected();
    while (Date.now() - start < timeoutMs) {
      try {
        if (!this.unity.isConnected()) {
          await this.ensureConnected();
        }
        if (!this.unity.isConnected()) {
          await sleep(pollMs);
          continue;
        }
        // Prefer editor state if available
        let busy = false;
        try {
          const editor = await this.unity.sendCommand('get_editor_state', {});
          busy = !!(editor && (editor.isCompiling || editor.isPlaying));
        } catch {}
        if (!busy) {
          const state = await this.unity.sendCommand('get_compilation_state', { includeMessages: false });
          const compiling = !!(state && (state.isCompiling || state.isAssemblyReloading || state.domainReloadRequested));
          if (!compiling) return true;
        }
      } catch (e) {
        // If Unity not reachable or command fails, back off but don't block forever
        logger.warn(`[WriteGate] get_compilation_state failed: ${e.message}`);
      }
      await sleep(pollMs);
    }
    return false;
  }

  async sendWithGate(command, params, { preview = false, timeoutMs, pollMs } = {}) {
    // For preview operations, don't gate
    if (preview) {
      return this.unity.sendCommand(command, params);
    }
    const ok = await this.waitUntilIdle({ timeoutMs, pollMs });
    if (!ok) {
      logger.warn('[WriteGate] Timeout waiting for idle, sending anyway');
    }
    return this.unity.sendCommand(command, params);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
