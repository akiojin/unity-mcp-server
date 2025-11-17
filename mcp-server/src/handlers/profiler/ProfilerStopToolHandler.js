/**
 * Handler for stopping Unity Profiler recording session (via MCP)
 */
import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ProfilerStopToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'profiler_stop',
      'Stop Unity Profiler recording and save data to .data file. Returns profiling session summary including duration, frame count, and optionally recorded metrics.',
      {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description:
              'Optional session ID to stop. If not provided, stops the current active session.'
          }
        }
      }
    );
    this.unityConnection = unityConnection;
  }

  /** @override */
  async execute(params, _context) {
    const command = {
      command: 'profiler_stop',
      parameters: params || {}
    };

    const result = await this.unityConnection.sendCommand(command);
    return result;
  }
}
