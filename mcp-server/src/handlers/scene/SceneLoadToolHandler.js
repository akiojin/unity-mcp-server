import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for loading scenes in Unity
 */
export class SceneLoadToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('load_scene', 'Load a scene by path or name (Single/Additive).', {
      type: 'object',
      properties: {
        scenePath: {
          type: 'string',
          description: 'Full path to the scene file (e.g., "Assets/Scenes/MainMenu.unity")'
        },
        sceneName: {
          type: 'string',
          description:
            'Name of the scene to load (must be in build settings). Use either scenePath or sceneName, not both.'
        },
        loadMode: {
          type: 'string',
          enum: ['Single', 'Additive'],
          description:
            'How to load the scene. Single replaces current scene(s), Additive adds to current scene(s) (default: Single)'
        }
      },
      required: []
    });
    this.unityConnection = unityConnection;
  }

  /**
   * Validates the input parameters
   * @param {object} params - Input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    // Don't call super.validate() since we have no required fields

    // Validate that either scenePath or sceneName is provided
    if (!params.scenePath && !params.sceneName) {
      throw new Error('Either scenePath or sceneName must be provided');
    }

    // Validate that only one is provided
    if (params.scenePath && params.sceneName) {
      throw new Error('Provide either scenePath or sceneName, not both');
    }

    // Validate load mode
    if (params.loadMode && !['Single', 'Additive'].includes(params.loadMode)) {
      throw new Error('Invalid load mode. Must be "Single" or "Additive"');
    }
  }

  /**
   * Executes the load scene command
   * @param {object} params - Validated input parameters
   * @returns {Promise<object>} Load result
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      throw new Error('Unity connection not available');
    }

    // Send command to Unity
    const result = await this.unityConnection.sendCommand('load_scene', params);

    // Unity returns errors as { error: "..." } payloads (still wrapped in a success response)
    if (result && result.error) {
      const error = new Error(result.error);
      error.code = 'UNITY_ERROR';
      throw error;
    }

    // Handle undefined or null results from Unity (best-effort)
    if (result === undefined || result === null) {
      return {
        sceneName: params.sceneName || 'Unknown',
        scenePath: params.scenePath || 'Unknown',
        loadMode: params.loadMode || 'Single',
        message: 'Scene operation completed but Unity returned no details'
      };
    }

    return result;
  }
}
