import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for discovering available component types in Unity
 */
export class GetComponentTypesToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'get_component_types',
      'Get available component types in Unity',
      {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by category (e.g., "Physics", "Rendering", "UI")'
          },
          search: {
            type: 'string',
            description: 'Search for component types by name'
          },
          onlyAddable: {
            type: 'boolean',
            description: 'Return only components that can be added to GameObjects (default: false)'
          }
        }
      }
    );
    
    this.unityConnection = unityConnection;
  }

  /**
   * Executes the get component types operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The list of available component types
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('get_component_types', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return result
    return {
      componentTypes: response.componentTypes || [],
      totalCount: response.totalCount || 0,
      categories: response.categories || [],
      ...(response.searchTerm !== undefined && { searchTerm: response.searchTerm }),
      ...(response.onlyAddable !== undefined && { onlyAddable: response.onlyAddable })
    };
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      getAllTypes: {
        description: 'Get all available component types',
        params: {}
      },
      getPhysicsComponents: {
        description: 'Get only physics-related components',
        params: {
          category: 'Physics'
        }
      },
      searchColliders: {
        description: 'Search for collider components',
        params: {
          search: 'collider'
        }
      },
      getAddableComponents: {
        description: 'Get only components that can be added',
        params: {
          onlyAddable: true
        }
      },
      searchPhysicsAddable: {
        description: 'Search for addable physics components',
        params: {
          category: 'Physics',
          onlyAddable: true,
          search: 'body'
        }
      }
    };
  }
}