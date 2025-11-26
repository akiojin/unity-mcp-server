import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for creating new scenes in Unity
 */
export class SceneCreateToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('scene_create', 'Create a new scene (optionally load it and add to build settings).', {
      type: 'object',
      properties: {
        sceneName: {
          type: 'string',
          description: 'Name of the scene to create'
        },
        path: {
          type: 'string',
          description:
            'Path where the scene should be saved (e.g., "Assets/Scenes/"). If not specified, defaults to "Assets/Scenes/"'
        },
        loadScene: {
          type: 'boolean',
          description: 'Whether to load the scene after creation (default: true)'
        },
        addToBuildSettings: {
          type: 'boolean',
          description: 'Whether to add the scene to build settings (default: false)'
        }
      },
      required: ['sceneName']
    });
    this.unityConnection = unityConnection;
  }

  /**
   * Validates the input parameters
   * @param {object} params - Input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    super.validate(params);

    // Additional validation for scene name
    if (!params.sceneName || params.sceneName.trim() === '') {
      throw new Error('Scene name cannot be empty');
    }

    // Check for invalid characters in scene name
    if (params.sceneName.includes('/') || params.sceneName.includes('\\')) {
      throw new Error('Scene name contains invalid characters');
    }
  }

  /**
   * Executes the create scene command
   * @param {object} params - Validated input parameters
   * @returns {Promise<object>} Creation result
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      throw new Error('Unity connection not available');
    }

    // Send command to Unity
    const result = await this.unityConnection.sendCommand('create_scene', params);

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
        sceneName: params.sceneName,
        path: params.path || 'Assets/Scenes/',
        loadScene: params.loadScene !== false,
        addToBuildSettings: params.addToBuildSettings === true,
        message: 'Scene creation completed but Unity returned no details'
      };
    }

    return result.result;
  }
}
