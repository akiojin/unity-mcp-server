import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for reading terminal output
 * Implements SPEC-3a7f2e8d: Terminal Read Feature
 */
export class TerminalReadToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'terminal_read',
      'Read terminal output from a session',
      {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session identifier'
          },
          maxLines: {
            type: 'number',
            default: 100,
            description: 'Maximum number of lines to return (default: 100, max: 1000)'
          }
        },
        required: ['sessionId']
      }
    );

    this.unityConnection = unityConnection;
  }

  /**
   * Reads terminal output from a session
   * @param {Object} params - The validated input parameters
   * @param {string} params.sessionId - Session identifier
   * @param {number} [params.maxLines=100] - Maximum lines to return
   * @returns {Promise<Object>} Terminal output (lines, hasMore)
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Validate maxLines
    const maxLines = params.maxLines || 100;
    if (maxLines > 1000) {
      throw new Error(`MAX_LINES_EXCEEDED: maxLines ${maxLines} exceeds maximum allowed (1000)`);
    }

    // Send command to Unity
    const command = {
      command: 'terminal_read',
      sessionId: params.sessionId,
      maxLines
    };

    const response = await this.unityConnection.sendCommand(command);

    // Handle errors
    if (response && response.error) {
      if (response.error.includes('not found')) {
        throw new Error(`SESSION_NOT_FOUND: Terminal session '${params.sessionId}' not found`);
      }
      throw new Error(response.error);
    }

    return {
      lines: response?.lines || [],
      hasMore: response?.hasMore || false
    };
  }
}
