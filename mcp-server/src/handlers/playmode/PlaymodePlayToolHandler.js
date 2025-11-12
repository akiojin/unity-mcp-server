import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for the playmode_play tool
 */
export class PlaymodePlayToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('playmode_play', 'Enter Play Mode.', {
      type: 'object',
      properties: {},
      required: []
    });
    this.unityConnection = unityConnection;
  }

  /**
   * Executes the play command
   * @param {object} params - Empty object for this command
   * @returns {Promise<object>} Play mode state
   */
  async execute(params) {
    const initialDelayMs =
      typeof params?.initialDelayMs === 'number' ? params.initialDelayMs : 3000;
    const reconnectIntervalMs =
      typeof params?.reconnectIntervalMs === 'number' ? params.reconnectIntervalMs : 500;
    const pollIntervalMs = typeof params?.pollIntervalMs === 'number' ? params.pollIntervalMs : 800;
    const maxWaitMs = typeof params?.maxWaitMs === 'number' ? params.maxWaitMs : null; // null = unlimited

    let lastPlayMessage = 'Entered play mode';
    try {
      if (!this.unityConnection.isConnected()) {
        await this.unityConnection.connect();
      }
      const result = await this.unityConnection.sendCommand('play_game', params);
      if (result?.status === 'error') {
        const error = new Error(result.error || 'Unity returned error');
        error.code = 'UNITY_ERROR';
        throw error;
      }
      lastPlayMessage = result?.message || lastPlayMessage;
      const startOk = Date.now();
      for (;;) {
        try {
          const state = await this.unityConnection.sendCommand('get_editor_state', {});
          const editorState = extractEditorState(state);
          if (editorState?.isPlaying) {
            return { status: 'success', message: lastPlayMessage, state: editorState };
          }
        } catch {}
        await sleep(Math.max(0, pollIntervalMs));
        if (maxWaitMs != null && Date.now() - startOk > maxWaitMs) {
          return result;
        }
      }
    } catch (err) {
      const msg = err?.message || '';
      const transient = /(Connection closed|timeout|ECONNRESET|EPIPE|socket|Not connected)/i.test(
        msg
      );
      if (!transient) throw err;

      const start = Date.now();
      await sleep(Math.max(0, initialDelayMs));
      // Reconnect until connected (unlimited unless maxWaitMs specified)
      for (;;) {
        if (this.unityConnection.isConnected()) break;
        try {
          await this.unityConnection.connect();
        } catch {}
        await sleep(Math.max(0, reconnectIntervalMs));
        if (maxWaitMs != null && Date.now() - start > maxWaitMs) {
          const e = new Error('Timed out waiting to reconnect after Play start');
          e.code = 'RECONNECT_TIMEOUT';
          throw e;
        }
      }
      // Poll for isPlaying
      for (;;) {
        try {
          const state = await this.unityConnection.sendCommand('get_editor_state', {});
          const editorState = extractEditorState(state);
          if (editorState?.isPlaying) {
            return {
              status: 'success',
              message: `${lastPlayMessage} (reconnected after reload)`,
              state: editorState
            };
          }
        } catch {}
        await sleep(Math.max(0, pollIntervalMs));
        if (maxWaitMs != null && Date.now() - start > maxWaitMs) {
          const e = new Error('Timed out waiting for Play mode after reconnect');
          e.code = 'PLAY_WAIT_TIMEOUT';
          throw e;
        }
      }
    }
  }
}

function extractEditorState(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  if (typeof payload.isPlaying === 'boolean') {
    return payload;
  }
  if (payload.state && typeof payload.state === 'object') {
    return payload.state;
  }
  if (payload._editorState && typeof payload._editorState === 'object') {
    return payload._editorState;
  }
  return null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, Math.max(0, ms || 0)));
}
