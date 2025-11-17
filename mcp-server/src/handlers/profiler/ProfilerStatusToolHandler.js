/**
 * Handler for getting Unity Profiler recording status (via MCP)
 */
import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ProfilerStatusToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'profiler_status',
      'Get current Unity Profiler recording status. Returns information about active session, elapsed time, and remaining time (if auto-stop is configured).',
      {
        type: 'object',
        properties: {}
      }
    );
    this.unityConnection = unityConnection;
  }

  /** @override */
  async execute(params, _context) {
    const command = {
      command: 'profiler_status',
      parameters: params || {}
    };

    const result = await this.unityConnection.sendCommand(command);
    return result;
  }
}
