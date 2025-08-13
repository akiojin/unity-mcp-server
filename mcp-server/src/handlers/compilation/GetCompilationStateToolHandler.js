import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for getting Unity compilation state and errors
 */
export class GetCompilationStateToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'get_compilation_state',
      'Get current Unity compilation state, errors, and warnings with enhanced detection',
      {
        type: 'object',
        properties: {
          includeMessages: {
            type: 'boolean',
            description: 'Include detailed compilation messages (default: false)'
          },
          maxMessages: {
            type: 'number',
            description: 'Maximum number of messages to return (default: 50)'
          }
        }
      }
    );
    
    this.unityConnection = unityConnection;
  }

  /**
   * Executes the get compilation state operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The compilation state and messages
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('get_compilation_state', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return result
    return {
      success: response.success,
      isCompiling: response.isCompiling,
      isUpdating: response.isUpdating,
      isMonitoring: response.isMonitoring,
      lastCompilationTime: response.lastCompilationTime,
      messageCount: response.messageCount,
      errorCount: response.errorCount,
      warningCount: response.warningCount,
      ...(response.messages !== undefined && { messages: response.messages })
    };
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      getBasicState: {
        description: 'Get compilation state without detailed messages',
        params: {
          includeMessages: false
        }
      },
      getFullState: {
        description: 'Get compilation state with all error details',
        params: {
          includeMessages: true,
          maxMessages: 100
        }
      },
      getRecentErrors: {
        description: 'Get recent compilation errors only',
        params: {
          includeMessages: true,
          maxMessages: 10
        }
      }
    };
  }
}