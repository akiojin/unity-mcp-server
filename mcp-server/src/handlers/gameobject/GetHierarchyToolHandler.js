import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for the get_hierarchy tool
 * Gets the Unity scene hierarchy
 */
export class GetHierarchyToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'get_hierarchy',
      'Get the Unity scene hierarchy',
      {
        type: 'object',
        properties: {
          includeInactive: {
            type: 'boolean',
            description: 'Include inactive GameObjects (default: true)'
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum depth to traverse (-1 for unlimited, default: -1)',
            minimum: -1
          },
          includeComponents: {
            type: 'boolean',
            description: 'Include component information (default: false)'
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
    
    // Validate maxDepth
    if (params.maxDepth !== undefined) {
      const depth = Number(params.maxDepth);
      if (isNaN(depth) || depth < -1) {
        throw new Error('maxDepth must be -1 or a positive number');
      }
    }
  }

  /**
   * Executes the get_hierarchy command
   * @param {object} params - Input parameters
   * @returns {Promise<object>} Scene hierarchy
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }
    
    // Send get_hierarchy command
    const result = await this.unityConnection.sendCommand('get_hierarchy', params);
    
    // Check for errors from Unity
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Add helpful summary
    if (result.hierarchy) {
      result.totalObjects = this.countObjects(result.hierarchy);
      result.summary = `Scene "${result.sceneName}" contains ${result.totalObjects} GameObject${result.totalObjects !== 1 ? 's' : ''} (${result.objectCount} at root level)`;
    }
    
    return result;
  }

  /**
   * Counts total objects in hierarchy recursively
   * @param {Array} hierarchy - Hierarchy array
   * @returns {number} Total object count
   */
  countObjects(hierarchy) {
    let count = 0;
    
    for (const node of hierarchy) {
      count++; // Count this node
      
      if (node.children && Array.isArray(node.children)) {
        count += this.countObjects(node.children);
      }
    }
    
    return count;
  }
}