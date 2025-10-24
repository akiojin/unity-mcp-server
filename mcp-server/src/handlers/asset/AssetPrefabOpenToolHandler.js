import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for opening prefabs in Unity's prefab mode
 */
export class AssetPrefabOpenToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'asset_prefab_open',
      'Open a prefab asset in prefab mode for editing. Once in prefab mode, use component tools (list_components, add_component, etc.) to inspect and modify components.',
      {
        type: 'object',
        properties: {
          prefabPath: {
            type: 'string',
            description: 'Asset path to the prefab (must start with Assets/ and end with .prefab)'
          },
          focusObject: {
            type: 'string',
            description: 'Optional path to object within prefab to focus on (relative to prefab root)'
          },
          isolateObject: {
            type: 'boolean',
            description: 'Isolate the focused object in the hierarchy (default: false)'
          }
        },
        required: ['prefabPath']
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
    super.validate(params); // Check required fields
    
    const { prefabPath } = params;

    // Validate prefabPath is not empty
    if (!prefabPath || prefabPath.trim() === '') {
      throw new Error('prefabPath cannot be empty');
    }

    // Validate prefabPath format
    if (!prefabPath.startsWith('Assets/') || !prefabPath.endsWith('.prefab')) {
      throw new Error('prefabPath must start with Assets/ and end with .prefab');
    }
  }

  /**
   * Executes the open prefab operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The result of opening the prefab
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('open_prefab', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return result
    return {
      success: response.success,
      prefabPath: response.prefabPath,
      isInPrefabMode: response.isInPrefabMode,
      prefabContentsRoot: response.prefabContentsRoot,
      message: response.message || 'Prefab opened',
      ...(response.focusedObject !== undefined && { focusedObject: response.focusedObject }),
      ...(response.wasAlreadyOpen !== undefined && { wasAlreadyOpen: response.wasAlreadyOpen })
    };
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      openSimple: {
        description: 'Open a prefab for editing',
        params: {
          prefabPath: 'Assets/Prefabs/PlayerCharacter.prefab'
        }
      },
      openWithFocus: {
        description: 'Open prefab and focus on specific object',
        params: {
          prefabPath: 'Assets/Prefabs/UI/MainMenu.prefab',
          focusObject: '/Canvas/Buttons/StartButton'
        }
      },
      openWithIsolation: {
        description: 'Open prefab and isolate specific object',
        params: {
          prefabPath: 'Assets/Prefabs/Enemies/Boss.prefab',
          focusObject: '/Armature/Hips/Spine',
          isolateObject: true
        }
      },
      openForComponentWork: {
        description: 'Open prefab for component inspection and modification (use with component tools like list_components, add_component, etc.)',
        params: {
          prefabPath: 'Assets/Prefabs/Weapons/Sword.prefab'
        }
      }
    };
  }
}