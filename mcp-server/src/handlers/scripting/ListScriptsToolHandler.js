import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for listing C# scripts in Unity
 */
export class ListScriptsToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'list_scripts',
      'List C# scripts in Unity project',
      {
        type: 'object',
        properties: {
          searchPath: {
            type: 'string',
            default: 'Assets/',
            description: 'Directory to search for scripts'
          },
          pattern: {
            type: 'string',
            description: 'Pattern to match script names (supports wildcards like *Controller*)'
          },
          scriptType: {
            type: 'string',
            enum: ['MonoBehaviour', 'ScriptableObject', 'Editor', 'StaticClass', 'Interface'],
            description: 'Filter by script type'
          },
          sortBy: {
            type: 'string',
            enum: ['name', 'path', 'size', 'lastModified', 'type'],
            default: 'name',
            description: 'Sort results by field'
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'asc',
            description: 'Sort order (ascending or descending)'
          },
          includeMetadata: {
            type: 'boolean',
            default: false,
            description: 'Include file metadata (size, modification date, etc.)'
          },
          maxResults: {
            type: 'number',
            minimum: 1,
            maximum: 1000,
            default: 100,
            description: 'Maximum number of results to return'
          }
        },
        required: []
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
    const { searchPath, scriptType, sortBy, sortOrder, maxResults } = params;

    // Validate searchPath if provided
    if (searchPath && !searchPath.startsWith('Assets/')) {
      throw new Error('searchPath must start with Assets/');
    }

    // Validate scriptType if provided
    if (scriptType && !['MonoBehaviour', 'ScriptableObject', 'Editor', 'StaticClass', 'Interface'].includes(scriptType)) {
      throw new Error('scriptType must be one of: MonoBehaviour, ScriptableObject, Editor, StaticClass, Interface');
    }

    // Validate sortBy if provided
    if (sortBy && !['name', 'path', 'size', 'lastModified', 'type'].includes(sortBy)) {
      throw new Error('sortBy must be one of: name, path, size, lastModified, type');
    }

    // Validate sortOrder if provided
    if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
      throw new Error('sortOrder must be one of: asc, desc');
    }

    // Validate maxResults if provided
    if (maxResults !== undefined && (maxResults < 1 || maxResults > 1000)) {
      throw new Error('maxResults must be between 1 and 1000');
    }
  }

  /**
   * Executes the script listing
   * @param {Object} params - The input parameters
   * @returns {Promise<Object>} The result of the script listing
   */
  async execute(params) {
    const {
      searchPath,
      pattern,
      scriptType,
      sortBy,
      sortOrder,
      includeMetadata,
      maxResults
    } = params;

    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Prepare command parameters
    const commandParams = {
      searchPath: searchPath.endsWith('/') ? searchPath : searchPath + '/',
      sortBy,
      sortOrder,
      includeMetadata,
      maxResults
    };

    // Add optional filters
    if (pattern) {
      commandParams.pattern = pattern;
    }
    if (scriptType) {
      commandParams.scriptType = scriptType;
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('list_scripts', commandParams);

    // Handle Unity response
    if (response.success === false || response.status === 'error') {
      throw new Error(response.error || 'Failed to list scripts');
    }

    // Handle nested data structure from Unity
    const data = response.data || response;

    // Build result object
    const result = {
      scripts: data.scripts || [],
      totalCount: data.totalCount || 0,
      message: data.message || 'Scripts listed successfully'
    };

    // Include optional metadata if available
    if (data.hasMore !== undefined) {
      result.hasMore = data.hasMore;
    }
    if (data.nextOffset !== undefined) {
      result.nextOffset = data.nextOffset;
    }
    if (data.typeDistribution) {
      result.typeDistribution = data.typeDistribution;
    }
    if (data.searchTime !== undefined) {
      result.searchTime = data.searchTime;
    }

    return result;
  }
}