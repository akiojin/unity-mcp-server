import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for starting Unity compilation monitoring
 */
export class StartCompilationMonitoringToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'start_compilation_monitoring',
      'Start monitoring Unity compilation events and error detection',
      {
        type: 'object',
        properties: {}
      }
    );
    
    this.unityConnection = unityConnection;
  }

  /**
   * Executes the start compilation monitoring operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The result of starting compilation monitoring
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('start_compilation_monitoring', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return result
    return {
      success: response.success,
      isMonitoring: response.isMonitoring,
      message: response.message || 'Compilation monitoring started'
    };
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      startMonitoring: {
        description: 'Start compilation monitoring to detect errors in real-time',
        params: {}
      }
    };
  }
}