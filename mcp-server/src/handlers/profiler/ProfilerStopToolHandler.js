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
    // Validate sessionId format (32 hex characters, no hyphens)
    if (params?.sessionId) {
      if (typeof params.sessionId !== 'string') {
        return {
          error: 'Invalid sessionId parameter. Must be a string.',
          code: 'E_INVALID_PARAMETER'
        };
      }
      if (!/^[0-9a-f]{32}$/.test(params.sessionId)) {
        return {
          error: `Invalid sessionId format '${params.sessionId}'. Must be 32 hex characters without hyphens.`,
          code: 'E_INVALID_PARAMETER'
        };
      }
    }

    const command = {
      command: 'profiler_stop',
      parameters: params || {}
    };

    const result = await this.unityConnection.sendCommand(command);
    return result;
  }
}
