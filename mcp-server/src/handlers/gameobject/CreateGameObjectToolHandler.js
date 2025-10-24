import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { validateVector3, validateLayer } from '../../utils/validators.js';

/**
 * Handler for the gameobject_create tool
 * Creates GameObjects in Unity scene
 */
export class CreateGameObjectToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'gameobject_create',
      'Create a GameObject in Unity scene',
      {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the GameObject (default: "GameObject")'
          },
          primitiveType: {
            type: 'string',
            description: 'Type of primitive to create',
            enum: ['cube', 'sphere', 'cylinder', 'capsule', 'plane', 'quad']
          },
          position: {
            type: 'object',
            description: 'World position',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              z: { type: 'number' }
            }
          },
          rotation: {
            type: 'object',
            description: 'Rotation in Euler angles',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              z: { type: 'number' }
            }
          },
          scale: {
            type: 'object',
            description: 'Local scale',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              z: { type: 'number' }
            }
          },
          parentPath: {
            type: 'string',
            description: 'Path to parent GameObject (e.g., "/Parent/Child")'
          },
          tag: {
            type: 'string',
            description: 'Tag to assign to the GameObject'
          },
          layer: {
            type: 'number',
            description: 'Layer index (0-31)',
            minimum: 0,
            maximum: 31
          }
        },
        required: []
      }
    );
    
    this.unityConnection = unityConnection;
  }

  /**
   * Validates the input parameters
   * @param {object} params - Input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    super.validate(params);
    
    // Validate primitive type if provided
    if (params.primitiveType) {
      const validTypes = ['cube', 'sphere', 'cylinder', 'capsule', 'plane', 'quad'];
      if (!validTypes.includes(params.primitiveType.toLowerCase())) {
        throw new Error(`primitiveType must be one of: ${validTypes.join(', ')}`);
      }
    }
    
    // Validate vector3 properties
    if (params.position) validateVector3(params.position, 'position');
    if (params.rotation) validateVector3(params.rotation, 'rotation');
    if (params.scale) validateVector3(params.scale, 'scale');
    
    // Validate layer
    if (params.layer !== undefined) {
      validateLayer(Number(params.layer));
    }
  }

  /**
   * Executes the create_gameobject command
   * @param {object} params - Input parameters
   * @returns {Promise<object>} Created GameObject info
   */
  async execute(params) {
    console.error('[CreateGameObject] Starting execution with params:', params);
    
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      console.error('[CreateGameObject] Not connected to Unity, attempting to connect...');
      await this.unityConnection.connect();
      console.error('[CreateGameObject] Connected to Unity');
    } else {
      console.error('[CreateGameObject] Already connected to Unity');
    }
    
    // Send create_gameobject command
    console.error('[CreateGameObject] Sending command to Unity...');
    const result = await this.unityConnection.sendCommand('create_gameobject', params);
    console.error('[CreateGameObject] Received result from Unity:', result);
    
    // Check for errors from Unity
    if (result.error) {
      console.error('[CreateGameObject] Unity returned error:', result.error);
      throw new Error(result.error);
    }
    
    return result;
  }
}
