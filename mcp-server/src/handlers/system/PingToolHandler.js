import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for the ping tool
 * Tests connection to Unity Editor
 */
export class PingToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'ping',
      'Test connection to Unity Editor',
      {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Optional message to echo back'
          }
        },
        required: []
      }
    );
    
    this.unityConnection = unityConnection;
  }

  /**
   * Executes the ping command
   * @param {object} params - Input parameters
   * @returns {Promise<object>} Ping result
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }
    
    // Send ping command with optional message
    const result = await this.unityConnection.sendCommand('ping', {
      message: params.message || 'ping'
    });
    
    // Format the result for the response
    return {
      message: result.message,
      echo: result.echo || params.message || 'ping',
      timestamp: result.timestamp || new Date().toISOString(),
      unityVersion: result.unityVersion,
      version: result._version || result.version,
      editorState: result._editorState || result.editorState
    };
  }
}
