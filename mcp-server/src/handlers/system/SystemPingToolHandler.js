import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { CATEGORIES, SCOPES } from '../base/categories.js';
import { OFFLINE_TOOLS, OFFLINE_TOOLS_HINT } from '../../constants/offlineTools.js';

/**
 * Handler for the system_ping tool
 * Tests connection to Unity Editor
 */
export class SystemPingToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'system_ping',
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
      },
      {
        category: CATEGORIES.SYSTEM,
        scope: SCOPES.READ,
        keywords: ['ping', 'test', 'connection', 'health', 'status'],
        tags: ['system', 'diagnostic', 'health-check']
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
    try {
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
        success: true,
        message: result.message,
        echo: result.echo || params.message || 'ping',
        timestamp: result.timestamp || new Date().toISOString(),
        unityVersion: result.unityVersion,
        version: result._version || result.version,
        editorState: result._editorState || result.editorState
      };
    } catch (error) {
      // Return offline tools information when connection fails
      return {
        success: false,
        error: 'unity_connection_failed',
        message: error.message || 'Failed to connect to Unity Editor',
        offlineToolsAvailable: OFFLINE_TOOLS,
        hint: OFFLINE_TOOLS_HINT
      };
    }
  }
}
