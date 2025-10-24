import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for saving prefab changes in Unity
 */
export class AssetPrefabSaveToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'asset_prefab_save',
      'Save current prefab changes in prefab mode or save a GameObject as prefab override',
      {
        type: 'object',
        properties: {
          gameObjectPath: {
            type: 'string',
            description: 'Path to GameObject to save as prefab override (optional - if not provided, saves current prefab in prefab mode)'
          },
          includeChildren: {
            type: 'boolean',
            description: 'Include child object overrides when saving (default: true)'
          }
        }
      }
    );
    
    this.unityConnection = unityConnection;
  }

  /**
   * Validates the input parameters
   * @param {Object} params - The input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    const { gameObjectPath } = params;

    // If gameObjectPath is provided, ensure it's not empty
    if (gameObjectPath !== undefined && gameObjectPath.trim() === '') {
      throw new Error('gameObjectPath cannot be empty when provided');
    }
  }

  /**
   * Executes the save prefab operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The result of saving the prefab
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('save_prefab', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return result
    return {
      success: response.success,
      message: response.message || 'Prefab saved',
      ...(response.savedInPrefabMode !== undefined && { savedInPrefabMode: response.savedInPrefabMode }),
      ...(response.prefabPath !== undefined && { prefabPath: response.prefabPath }),
      ...(response.gameObjectPath !== undefined && { gameObjectPath: response.gameObjectPath }),
      ...(response.overridesApplied !== undefined && { overridesApplied: response.overridesApplied }),
      ...(response.includedChildren !== undefined && { includedChildren: response.includedChildren })
    };
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      saveInPrefabMode: {
        description: 'Save changes while in prefab mode',
        params: {}
      },
      savePrefabInstance: {
        description: 'Save GameObject prefab instance overrides',
        params: {
          gameObjectPath: '/Player'
        }
      },
      saveWithChildren: {
        description: 'Save prefab instance including all child overrides',
        params: {
          gameObjectPath: '/UI/MainMenu',
          includeChildren: true
        }
      },
      saveWithoutChildren: {
        description: 'Save only the root GameObject overrides',
        params: {
          gameObjectPath: '/Enemies/Boss',
          includeChildren: false
        }
      }
    };
  }
}