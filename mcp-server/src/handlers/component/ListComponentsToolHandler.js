import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for listing components on GameObjects in Unity
 */
export class ListComponentsToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'component_list',
      'List all components on a GameObject in Unity (works in both scene and prefab mode)',
      {
        type: 'object',
        properties: {
          gameObjectPath: {
            type: 'string',
            description: 'Path to the GameObject (e.g., "/Player" or "/Canvas/Button")'
          },
          includeInherited: {
            type: 'boolean',
            description: 'Include inherited base component types (default: false)'
          }
        },
        required: ['gameObjectPath']
      }
    );
    
    this.unityConnection = unityConnection;
  }

  /**
   * Executes the list components operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The list of components
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('list_components', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return result
    return {
      gameObjectPath: response.gameObjectPath,
      components: response.components || [],
      componentCount: response.componentCount || 0,
      ...(response.includesInherited !== undefined && { includesInherited: response.includesInherited })
    };
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      listBasicComponents: {
        description: 'List all components on a GameObject',
        params: {
          gameObjectPath: '/Player'
        }
      },
      listWithInherited: {
        description: 'List components including inherited types',
        params: {
          gameObjectPath: '/Player',
          includeInherited: true
        }
      },
      listUIComponents: {
        description: 'List components on a UI element',
        params: {
          gameObjectPath: '/Canvas/Button'
        }
      }
    };
  }
}