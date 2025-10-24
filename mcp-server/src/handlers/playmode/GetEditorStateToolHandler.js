import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for getting Unity editor state
 */
export class GetEditorStateToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'playmode_get_state',
      'Get editor state (play mode, platform, selected objects, etc.). Optionally wait for a target state.',
      {
        type: 'object',
        properties: {
          waitFor: {
            type: 'object',
            properties: { isPlaying: { type: 'boolean' } },
            required: ['isPlaying']
          },
          timeoutMs: { type: 'number' },
          pollMs: { type: 'number' }
        },
        required: []
      }
    );
    this.unityConnection = unityConnection;
    // 軽量なソフトキャッシュ（単発取得時のみ使用）
    this._last = { t: 0, state: null };
    this._minIntervalMs = parseInt(process.env.MIN_EDITOR_STATE_INTERVAL_MS || '', 10);
    if (!(this._minIntervalMs >= 0)) this._minIntervalMs = 250; // 既定250ms
  }

  /**
   * Executes the get editor state command
   * @param {object} params - Empty object for this command
   * @returns {Promise<object>} Editor state information
   */
  async execute(params) {
    const wait = params?.waitFor;
    const timeoutMs = typeof params?.timeoutMs === 'number' ? params.timeoutMs : null;
    const pollMs = typeof params?.pollMs === 'number' ? params.pollMs : 500;

    const getOnce = async () => {
      // 非waitモード時はキャッシュを活用
      if (!wait && this._last.state && Date.now() - this._last.t < this._minIntervalMs) {
        return this._last.state;
      }
      if (!this.unityConnection.isConnected()) {
        await this.unityConnection.connect();
      }
      const result = await this.unityConnection.sendCommand('get_editor_state', {});
      if (result.status === 'error') {
        const error = new Error(result.error);
        error.code = 'UNITY_ERROR';
        throw error;
      }
      if (!wait) {
        this._last = { t: Date.now(), state: result };
      }
      return result;
    };

    if (!wait) {
      return await getOnce();
    }

    const want = !!wait.isPlaying;
    const start = Date.now();
    for (;;) {
      try {
        const state = await this.unityConnection.sendCommand('get_editor_state', {});
        if (state && !!state.isPlaying === want) {
          return { status: 'success', state, waitedMs: Date.now() - start };
        }
      } catch {}
      await new Promise(r => setTimeout(r, pollMs));
      if (timeoutMs != null && Date.now() - start > timeoutMs) {
        return await getOnce();
      }
    }
  }
}
