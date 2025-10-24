import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for stopping Unity play mode
 */
export class StopToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'playmode_stop',
      'Exit Play Mode and return to Edit Mode.',
      {
        type: 'object',
        properties: {},
        required: []
      }
    );
    this.unityConnection = unityConnection;
  }

  /**
   * Executes the stop command
   * @param {object} params - Empty object for this command
   * @returns {Promise<object>} Play mode state
   */
  async execute(params) {
    const reconnectIntervalMs = typeof params?.reconnectIntervalMs === 'number' ? params.reconnectIntervalMs : 500;
    const pollIntervalMs = typeof params?.pollIntervalMs === 'number' ? params.pollIntervalMs : 500;
    const maxWaitMs = typeof params?.maxWaitMs === 'number' ? params.maxWaitMs : null; // null = unlimited

    try {
      if (!this.unityConnection.isConnected()) {
        await this.unityConnection.connect();
      }
      const result = await this.unityConnection.sendCommand('stop_game', params);
      if (result?.status === 'error') {
        const error = new Error(result.error || 'Unity returned error');
        error.code = 'UNITY_ERROR';
        throw error;
      }
      const startOk = Date.now();
      for (;;) {
        try {
          const state = await this.unityConnection.sendCommand('playmode_get_state', {});
          if (state && !state.isPlaying) {
            return { status: 'success', message: 'Exited play mode', state };
          }
        } catch {}
        await sleep(pollIntervalMs);
        if (maxWaitMs != null && Date.now() - startOk > maxWaitMs) return result;
      }
    } catch (err) {
      const transient = /(Connection closed|timeout|ECONNRESET|EPIPE|socket|Not connected)/i.test(err?.message || '');
      if (!transient) throw err;
      const start = Date.now();
      for (;;) {
        if (!this.unityConnection.isConnected()) {
          try { await this.unityConnection.connect(); } catch {}
          await sleep(reconnectIntervalMs);
        }
        try {
          const state = await this.unityConnection.sendCommand('get_editor_state', {});
          if (state && !state.isPlaying) {
            return { status: 'success', message: 'Exited play mode (reconnected after reload)', state };
          }
        } catch {}
        await sleep(pollIntervalMs);
        if (maxWaitMs != null && Date.now() - start > maxWaitMs) {
          const e = new Error('Timed out waiting for stop');
          e.code = 'PLAY_WAIT_TIMEOUT';
          throw e;
        }
      }
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
