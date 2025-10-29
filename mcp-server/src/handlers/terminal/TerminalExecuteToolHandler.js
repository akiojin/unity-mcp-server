import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for executing commands in terminal session
 * Implements SPEC-3a7f2e8d: Terminal Execute Feature
 */
export class TerminalExecuteToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'terminal_execute',
      'Execute command in terminal session',
      {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session identifier returned by terminal_open'
          },
          command: {
            type: 'string',
            description: 'Command to execute in the terminal'
          }
        },
        required: ['sessionId', 'command']
      }
    );

    this.unityConnection = unityConnection;
  }

  /**
   * Executes a command in a terminal session
   * @param {Object} params - The validated input parameters
   * @param {string} params.sessionId - Session identifier
   * @param {string} params.command - Command to execute
   * @returns {Promise<Object>} Execution status (success, message)
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const command = {
      command: 'terminal_execute',
      sessionId: params.sessionId,
      commandText: params.command
    };

    const response = await this.unityConnection.sendCommand(command);

    // Handle errors
    if (response && response.error) {
      if (response.error.includes('not found')) {
        throw new Error(`SESSION_NOT_FOUND: Terminal session '${params.sessionId}' not found`);
      }
      if (response.error.includes('already closed')) {
        throw new Error(`SESSION_CLOSED: Terminal session '${params.sessionId}' is already closed`);
      }
      if (response.error.includes('not running')) {
        throw new Error(`PROCESS_NOT_RUNNING: Shell process for session '${params.sessionId}' is not running`);
      }
      throw new Error(response.error);
    }

    return {
      success: response && response.success !== false,
      message: response?.message || 'Command sent successfully'
    };
  }
}
