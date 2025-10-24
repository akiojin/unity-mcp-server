import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for removing components from GameObjects in Unity
 */
export class RemoveComponentToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'component_remove',
      'Remove a component from a GameObject (scene or prefab mode) by type/index.',
      {
        type: 'object',
        properties: {
          gameObjectPath: {
            type: 'string',
            description: 'Path to the GameObject (e.g., "/Player" or "/Canvas/Button")'
          },
          componentType: {
            type: 'string',
            description: 'Type of component to remove (e.g., "Rigidbody", "BoxCollider")'
          },
          componentIndex: {
            type: 'number',
            description: 'Index of component if multiple of same type exist (default: 0)'
          }
        },
        required: ['gameObjectPath', 'componentType']
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
    
    const { componentIndex } = params;

    // Validate component index if provided
    if (componentIndex !== undefined && componentIndex < 0) {
      throw new Error('componentIndex must be non-negative');
    }
  }

  /**
   * Executes the remove component operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The result of removing the component
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('remove_component', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return result
    return {
      removed: response.removed,
      componentType: response.componentType,
      message: response.message || 'Component removal completed',
      ...(response.componentIndex !== undefined && { componentIndex: response.componentIndex })
    };
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      removeRigidbody: {
        description: 'Remove Rigidbody component',
        params: {
          gameObjectPath: '/Player',
          componentType: 'Rigidbody'
        }
      },
      removeSpecificCollider: {
        description: 'Remove specific collider when multiple exist',
        params: {
          gameObjectPath: '/ComplexObject',
          componentType: 'BoxCollider',
          componentIndex: 1
        }
      },
      removeLight: {
        description: 'Remove Light component',
        params: {
          gameObjectPath: '/Lighting/OldLight',
          componentType: 'Light'
        }
      }
    };
  }
}
