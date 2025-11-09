import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class SystemGetCommandStatsToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'system_get_command_stats',
      'Retrieve aggregated counts and recent Unity command types to audit traffic.',
      {
        type: 'object',
        properties: {},
        required: []
      }
    );
    this.unityConnection = unityConnection;
  }

  async execute(_params) {
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }
    const result = await this.unityConnection.sendCommand('get_command_stats', {});
    return result;
  }
}
