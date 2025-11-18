import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for modifying component properties on GameObjects in Unity
 */
export class ComponentModifyToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'component_modify',
      'Modify properties of a component on a GameObject in Unity (works in both scene and prefab mode)',
      {
        type: 'object',
        properties: {
          gameObjectPath: {
            type: 'string',
            description: 'Path to the GameObject (e.g., "/Player" or "/Canvas/Button")'
          },
          componentType: {
            type: 'string',
            description: 'Type of component to modify (e.g., "Rigidbody", "Light")'
          },
          componentIndex: {
            type: 'number',
            description: 'Index of component if multiple of same type exist (default: 0)'
          },
          properties: {
            type: 'object',
            description: 'Properties to modify with their new values',
            additionalProperties: true
          }
        },
        required: ['gameObjectPath', 'componentType', 'properties']
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

    const { properties } = params;

    // Validate properties is not empty
    if (!properties || Object.keys(properties).length === 0) {
      throw new Error('properties cannot be empty');
    }
  }

  /**
   * Executes the modify component operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The result of modifying the component
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('modify_component', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return result
    return {
      componentType: response.componentType,
      modifiedProperties: response.modifiedProperties || [],
      message: response.message || 'Component properties updated',
      ...(response.componentIndex !== undefined && { componentIndex: response.componentIndex })
    };
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      modifyRigidbody: {
        description: 'Modify Rigidbody properties',
        params: {
          gameObjectPath: '/Player',
          componentType: 'Rigidbody',
          properties: {
            mass: 5.0,
            drag: 0.5,
            angularDrag: 0.05,
            useGravity: true,
            isKinematic: false
          }
        }
      },
      modifyLight: {
        description: 'Modify Light component settings',
        params: {
          gameObjectPath: '/Lighting/MainLight',
          componentType: 'Light',
          properties: {
            intensity: 2.0,
            color: { r: 1, g: 0.95, b: 0.8, a: 1 },
            range: 50,
            type: 'Point'
          }
        }
      },
      modifyNestedProperties: {
        description: 'Modify nested properties using dot notation',
        params: {
          gameObjectPath: '/Player',
          componentType: 'Rigidbody',
          properties: {
            'constraints.freezePositionX': true,
            'constraints.freezePositionY': false,
            'constraints.freezeRotationZ': true
          }
        }
      },
      modifyCamera: {
        description: 'Modify Camera settings',
        params: {
          gameObjectPath: '/MainCamera',
          componentType: 'Camera',
          properties: {
            fieldOfView: 75,
            nearClipPlane: 0.1,
            farClipPlane: 1000,
            depth: -1
          }
        }
      }
    };
  }
}
