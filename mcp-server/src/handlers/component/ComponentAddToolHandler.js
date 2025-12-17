import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for adding components to GameObjects in Unity
 */
export class ComponentAddToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'add_component',
      'Add a component to a GameObject (scene or prefab mode) with optional initial properties.',
      {
        type: 'object',
        properties: {
          gameObjectPath: {
            type: 'string',
            description: 'Scene path to the GameObject (e.g., "/Player" or "/Canvas/Button").'
          },
          componentType: {
            type: 'string',
            description: 'Type of component to add (e.g., "Rigidbody", "BoxCollider", "Light")'
          },
          properties: {
            type: 'object',
            description: 'Initial property values to set on the new component.',
            additionalProperties: true
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

    const { gameObjectPath, componentType } = params;

    if (!gameObjectPath || gameObjectPath.trim() === '') {
      throw new Error('gameObjectPath cannot be empty');
    }

    if (!componentType || componentType.trim() === '') {
      throw new Error('componentType cannot be empty');
    }
  }

  /**
   * Executes the add component operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The result of adding the component
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('add_component', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return success result
    return {
      componentType: response.componentType,
      gameObjectPath: response.gameObjectPath,
      message: response.message || 'Component added successfully',
      ...(response.properties && { appliedProperties: response.properties })
    };
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      addRigidbody: {
        description: 'Add Rigidbody with custom properties',
        params: {
          gameObjectPath: '/Player',
          componentType: 'Rigidbody',
          properties: {
            mass: 2.0,
            drag: 0.5,
            useGravity: true,
            isKinematic: false
          }
        }
      },
      addCollider: {
        description: 'Add BoxCollider to GameObject',
        params: {
          gameObjectPath: '/Player/Hitbox',
          componentType: 'BoxCollider',
          properties: {
            isTrigger: true,
            size: { x: 1, y: 2, z: 1 }
          }
        }
      },
      addLight: {
        description: 'Add Light component',
        params: {
          gameObjectPath: '/Lighting/MainLight',
          componentType: 'Light',
          properties: {
            type: 'Directional',
            intensity: 1.5,
            color: { r: 1, g: 0.95, b: 0.8, a: 1 }
          }
        }
      }
    };
  }
}
