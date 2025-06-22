import { BaseToolHandler } from '../BaseToolHandler.js';

/**
 * Handler for pausing/resuming Unity play mode
 */
export class PauseToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'pause_game',
      'Pause or resume Unity play mode',
      {
        type: 'object',
        properties: {},
        required: []
      }
    );
    this.unityConnection = unityConnection;
  }

  /**
   * Executes the pause/resume command
   * @param {object} params - Empty object for this command
   * @returns {Promise<object>} Play mode state
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      throw new Error('Unity connection not available');
    }
    
    // Send pause command to Unity
    const result = await this.unityConnection.sendCommand('pause_game', params);
    
    // Check for Unity-side errors
    if (result.status === 'error') {
      const error = new Error(result.error);
      error.code = 'UNITY_ERROR';
      throw error;
    }
    
    // Return the result with state information
    return result;
  }
}