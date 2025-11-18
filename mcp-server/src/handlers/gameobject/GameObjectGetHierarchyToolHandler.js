import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for the gameobject_get_hierarchy tool
 * Gets the Unity scene hierarchy
 */
export class GameObjectGetHierarchyToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'gameobject_get_hierarchy',
      'Get scene hierarchy. For large scenes, prefer nameOnly=true. With nameOnly, use maxObjects ~100–500; when requesting details, keep maxObjects ~10–50 to conserve tokens. Only enable includeComponents/includeTransform when necessary.',
      {
        type: 'object',
        properties: {
          rootPath: {
            type: 'string',
            description:
              'Path to GameObject whose children will be the root of the returned hierarchy (e.g., "/Team_0" returns Team_0\'s children). If not specified, returns scene root objects.'
          },
          includeInactive: {
            type: 'boolean',
            description: 'Include inactive GameObjects (default: true)'
          },
          maxDepth: {
            type: 'number',
            description:
              'Maximum depth to traverse from the root. 0=immediate children only (default), 1=children+grandchildren, 2=children+grandchildren+great-grandchildren, etc. (-1 for unlimited)',
            minimum: -1
          },
          includeComponents: {
            type: 'boolean',
            description:
              'Include component information (default: false). WARNING: Significantly increases response size - use with small maxObjects values.'
          },
          includeTransform: {
            type: 'boolean',
            description:
              'Include transform information (default: false). WARNING: Increases response size - use with small maxObjects values.'
          },
          includeTags: {
            type: 'boolean',
            description: 'Include tag information (default: false)'
          },
          includeLayers: {
            type: 'boolean',
            description: 'Include layer information (default: false)'
          },
          nameOnly: {
            type: 'boolean',
            description:
              'Return only names and paths for minimal data size (default: false). RECOMMENDED for large hierarchies to reduce token usage.'
          },
          maxObjects: {
            type: 'number',
            description:
              'Maximum number of objects to include in response. Unity default: 100 (-1 for unlimited). RECOMMENDED: 10-50 for detailed info, 100-500 for nameOnly mode to avoid MCP token limits',
            minimum: -1
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

    // Validate maxObjects
    if (params.maxObjects !== undefined) {
      const maxObjects = Number(params.maxObjects);
      if (isNaN(maxObjects) || maxObjects < -1) {
        throw new Error('maxObjects must be -1 or a positive number');
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
