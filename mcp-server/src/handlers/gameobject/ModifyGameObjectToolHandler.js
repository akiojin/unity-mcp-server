import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { validateVector3, validateLayer, validateGameObjectPath } from '../../utils/validators.js';

/**
 * Handler for the gameobject_modify tool
 * Modifies properties of existing GameObjects
 */
export class ModifyGameObjectToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'gameobject_modify',
      'Modify GameObject properties (transform/name/parent/active/tag/layer).',
      {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the GameObject to modify (required)'
          },
          name: {
            type: 'string',
            description: 'New name for the GameObject'
          },
          position: {
            type: 'object',
            description: 'New world position',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              z: { type: 'number' }
            }
          },
          rotation: {
            type: 'object',
            description: 'New rotation in Euler angles',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              z: { type: 'number' }
            }
          },
          scale: {
            type: 'object',
            description: 'New local scale',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              z: { type: 'number' }
            }
          },
          active: {
            type: 'boolean',
            description: 'Set active state'
          },
          parentPath: {
            type: ['string', 'null'],
            description: 'Path to new parent GameObject (null to unparent)'
          },
          tag: {
            type: 'string',
            description: 'New tag'
          },
          layer: {
            type: 'number',
            description: 'New layer index (0-31)',
            minimum: 0,
            maximum: 31
          }
        },
        required: ['path']
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
    
    // Path is required
    validateGameObjectPath(params.path);
    
    // At least one modification must be specified
    const modifiableProps = ['name', 'position', 'rotation', 'scale', 'active', 'parentPath', 'tag', 'layer'];
    const hasModification = modifiableProps.some(prop => params.hasOwnProperty(prop));
    
    if (!hasModification) {
      throw new Error('At least one property to modify must be specified');
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
   * Executes the modify_gameobject command
   * @param {object} params - Input parameters
   * @returns {Promise<object>} Modified GameObject info
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }
    
    // Send modify_gameobject command
    const result = await this.unityConnection.sendCommand('modify_gameobject', params);
    
    // Check for errors from Unity
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  }
}
