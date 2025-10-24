import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for the gameobject_delete tool
 * Deletes GameObjects from the Unity scene
 */
export class GameObjectDeleteToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'gameobject_delete',
      'Delete GameObject(s) by path or paths (optionally include children).',
      {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to a single GameObject to delete'
          },
          paths: {
            type: 'array',
            description: 'Array of paths to multiple GameObjects to delete',
            items: {
              type: 'string'
            }
          },
          includeChildren: {
            type: 'boolean',
            description: 'Whether to delete children (default: true)'
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
    
    // Either path or paths must be provided
    if (!params.path && (!params.paths || params.paths.length === 0)) {
      throw new Error('Either "path" or "paths" parameter must be provided');
    }
    
    // Validate paths array if provided
    if (params.paths) {
      if (!Array.isArray(params.paths)) {
        throw new Error('paths must be an array of strings');
      }
      
      for (const path of params.paths) {
        if (typeof path !== 'string') {
          throw new Error('All paths must be strings');
        }
      }
    }
  }

  /**
   * Executes the delete_gameobject command
   * @param {object} params - Input parameters
   * @returns {Promise<object>} Deletion result
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }
    
    // Send delete_gameobject command
    const result = await this.unityConnection.sendCommand('delete_gameobject', params);
    
    // Check for errors from Unity
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Add summary
    if (result.deletedCount !== undefined) {
      if (result.deletedCount === 0) {
        result.summary = 'No GameObjects were deleted';
      } else if (result.deletedCount === 1) {
        result.summary = `Deleted 1 GameObject: ${result.deleted[0]}`;
      } else {
        result.summary = `Deleted ${result.deletedCount} GameObjects`;
      }
      
      if (result.notFoundCount > 0) {
        result.summary += ` (${result.notFoundCount} not found)`;
      }
    }
    
    return result;
  }
}
