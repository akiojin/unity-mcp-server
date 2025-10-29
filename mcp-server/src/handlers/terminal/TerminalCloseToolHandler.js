import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for closing terminal session
 * Implements SPEC-3a7f2e8d: Terminal Close Feature
 */
export class TerminalCloseToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'terminal_close',
      'Close terminal session and terminate shell process',
      {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session identifier to close'
          }
        },
        required: ['sessionId']
      }
    );

    this.unityConnection = unityConnection;
  }

  /**
   * Closes a terminal session
   * @param {Object} params - The validated input parameters
   * @param {string} params.sessionId - Session identifier
   * @returns {Promise<Object>} Close status (success, message)
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const command = {
      command: 'terminal_close',
      sessionId: params.sessionId
    };

    const response = await this.unityConnection.sendCommand(command);

    // Handle errors
    if (response && response.error) {
      if (response.error.includes('not found')) {
        // Treat as idempotent - already closed is success
        return {
          success: true,
          message: `Terminal session '${params.sessionId}' not found (may already be closed)`
        };
      }
      if (response.error.includes('failed to terminate')) {
        throw new Error(`PROCESS_KILL_FAILED: Failed to terminate shell process for session '${params.sessionId}'`);
      }
      throw new Error(response.error);
    }

    return {
      success: response && response.success !== false,
      message: response?.message || 'Session closed successfully'
    };
  }
}
