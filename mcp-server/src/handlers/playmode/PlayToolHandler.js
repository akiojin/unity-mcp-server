import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for starting Unity play mode
 */
export class PlayToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'play_game',
      'Start Unity play mode to test the game. NOTE: This operation may take 10-60+ seconds depending on project size, scene complexity, and compilation requirements. Unity needs time to compile scripts, load assets, and initialize the scene. Please wait for the operation to complete.',
      {
        type: 'object',
        properties: {},
        required: []
      }
    );
    this.unityConnection = unityConnection;
  }

  /**
   * Executes the play command
   * @param {object} params - Empty object for this command
   * @returns {Promise<object>} Play mode state
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      throw new Error('Unity connection not available');
    }
    
    // Send play command to Unity
    const result = await this.unityConnection.sendCommand('play_game', params);
    
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