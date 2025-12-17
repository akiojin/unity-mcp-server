import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class PlaymodeWaitForStateToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'playmode_wait_for_state',
      'Wait until the Unity editor reaches the requested state (e.g., isPlaying).',
      {
        type: 'object',
        properties: {
          isPlaying: { type: 'boolean', description: 'Target play state (true=Play, false=Edit)' },
          timeoutMs: { type: 'number', description: 'Max wait time (null/omitted = unlimited)' },
          pollMs: { type: 'number', description: 'Polling interval in ms (default 500)' }
        },
        required: ['isPlaying']
      }
    );
    this.unityConnection = unityConnection;
  }

  async execute(params) {
    const want = !!params.isPlaying;
    const timeoutMs = typeof params?.timeoutMs === 'number' ? params.timeoutMs : null;
    const pollMs = typeof params?.pollMs === 'number' ? params.pollMs : 500;

    const start = Date.now();
    for (;;) {
      if (!this.unityConnection.isConnected()) {
        try {
          await this.unityConnection.connect();
        } catch {}
      }
      try {
        const state = await this.unityConnection.sendCommand('get_editor_state', {});
        if (!!state?.isPlaying === want) {
          return { status: 'success', state, waitedMs: Date.now() - start };
        }
      } catch {}
      await new Promise(r => setTimeout(r, pollMs));
      if (timeoutMs != null && Date.now() - start > timeoutMs) {
        const state = this.unityConnection.isConnected()
          ? await this.unityConnection.sendCommand('get_editor_state', {}).catch(() => ({}))
          : {};
        return { status: 'timeout', state, waitedMs: Date.now() - start };
      }
    }
  }
}
