import { BaseToolHandler } from './BaseToolHandler.js';

/**
 * Handler for listing scenes in Unity
 */
export class ListScenesToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'list_scenes',
      'List all scenes in the Unity project',
      {
        type: 'object',
        properties: {
          includeLoadedOnly: {
            type: 'boolean',
            description: 'Only include currently loaded scenes (default: false)'
          },
          includeBuildScenesOnly: {
            type: 'boolean',
            description: 'Only include scenes in build settings (default: false)'
          },
          includePath: {
            type: 'string',
            description: 'Filter scenes by path pattern (e.g., "Levels" to find scenes in Levels folder)'
          }
        },
        required: []
      }
    );
    this.unityConnection = unityConnection;
  }

  /**
   * Executes the list scenes command
   * @param {object} params - Validated input parameters
   * @returns {Promise<object>} List result
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      throw new Error('Unity connection not available');
    }
    
    // Send command to Unity
    const result = await this.unityConnection.sendCommand('list_scenes', params);
    
    // Check for Unity-side errors
    if (result.status === 'error') {
      const error = new Error(result.error);
      error.code = 'UNITY_ERROR';
      throw error;
    }
    
    return result.result;
  }
}