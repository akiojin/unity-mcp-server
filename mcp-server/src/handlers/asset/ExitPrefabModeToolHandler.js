import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for exiting Unity's prefab mode
 */
export class ExitPrefabModeToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'asset_prefab_exit_mode',
      'Exit prefab mode and return to the main scene',
      {
        type: 'object',
        properties: {
          saveChanges: {
            type: 'boolean',
            description: 'Save changes before exiting (default: true)'
          }
        }
      }
    );
    
    this.unityConnection = unityConnection;
  }

  /**
   * Executes the exit prefab mode operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The result of exiting prefab mode
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Default saveChanges to true
    const executeParams = {
      saveChanges: params.saveChanges !== undefined ? params.saveChanges : true
    };

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('exit_prefab_mode', executeParams);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return result
    return {
      success: response.success,
      wasInPrefabMode: response.wasInPrefabMode,
      message: response.message || 'Exited prefab mode',
      ...(response.changesSaved !== undefined && { changesSaved: response.changesSaved }),
      ...(response.prefabPath !== undefined && { prefabPath: response.prefabPath })
    };
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      exitAndSave: {
        description: 'Exit prefab mode and save changes',
        params: {
          saveChanges: true
        }
      },
      exitWithoutSave: {
        description: 'Exit prefab mode without saving changes',
        params: {
          saveChanges: false
        }
      },
      exitDefault: {
        description: 'Exit prefab mode (saves by default)',
        params: {}
      }
    };
  }
}