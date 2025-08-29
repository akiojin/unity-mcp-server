import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for saving scenes in Unity
 */
export class SaveSceneToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'save_scene',
      'Save current scene or save as a specified path.',
      {
        type: 'object',
        properties: {
          scenePath: {
            type: 'string',
            description: 'Path where to save the scene. If not provided, saves to current scene path. Required if saveAs is true.'
          },
          saveAs: {
            type: 'boolean',
            description: 'Whether to save as a new scene (creates a copy). Default: false'
          }
        },
        required: []
      }
    );
    this.unityConnection = unityConnection;
  }

  /**
   * Validates the input parameters
   * @param {object} params - Input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    // Don't call super.validate() since we have no required fields
    
    // Validate saveAs requires scenePath
    if (params.saveAs && !params.scenePath) {
      throw new Error('scenePath is required when saveAs is true');
    }
  }

  /**
   * Executes the save scene command
   * @param {object} params - Validated input parameters
   * @returns {Promise<object>} Save result
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      throw new Error('Unity connection not available');
    }
    
    // Send command to Unity
    const result = await this.unityConnection.sendCommand('save_scene', params);
    
    // Check for Unity-side errors
    if (result.status === 'error') {
      const error = new Error(result.error);
      error.code = 'UNITY_ERROR';
      throw error;
    }
    
    // Handle undefined or null results from Unity
    if (result.result === undefined || result.result === null) {
      return {
        status: 'success',
        scenePath: params.scenePath || 'Current scene path',
        saveAs: params.saveAs === true,
        message: 'Scene save completed but Unity returned no details'
      };
    }
    
    return result.result;
  }
}
