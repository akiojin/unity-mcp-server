import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for stopping Unity compilation monitoring
 */
export class StopCompilationMonitoringToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'stop_compilation_monitoring',
      'Stop monitoring compilation events.',
      {
        type: 'object',
        properties: {}
      }
    );
    
    this.unityConnection = unityConnection;
  }

  /**
   * Executes the stop compilation monitoring operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The result of stopping compilation monitoring
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('stop_compilation_monitoring', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return result
    return {
      success: response.success,
      isMonitoring: response.isMonitoring,
      message: response.message || 'Compilation monitoring stopped'
    };
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      stopMonitoring: {
        description: 'Stop compilation monitoring to reduce overhead',
        params: {}
      }
    };
  }
}
