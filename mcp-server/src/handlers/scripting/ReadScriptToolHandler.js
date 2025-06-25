import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for reading C# script contents in Unity
 */
export class ReadScriptToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'read_script',
      'Read the contents of a C# script file',
      {
        type: 'object',
        properties: {
          scriptPath: {
            type: 'string',
            description: 'Full path to the script file (e.g., Assets/Scripts/PlayerController.cs)'
          },
          scriptName: {
            type: 'string',
            description: 'Name of the script to search for (alternative to scriptPath)'
          },
          searchPath: {
            type: 'string',
            default: 'Assets/',
            description: 'Directory to search in when using scriptName'
          },
          includeMetadata: {
            type: 'boolean',
            default: true,
            description: 'Whether to include file metadata (line count, size, etc.)'
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
    const { scriptPath, scriptName, searchPath } = params;

    // Either scriptPath or scriptName must be provided
    if (!scriptPath && !scriptName) {
      throw new Error('Either scriptPath or scriptName must be provided');
    }

    // Validate scriptPath if provided
    if (scriptPath) {
      if (!scriptPath.startsWith('Assets/')) {
        throw new Error('scriptPath must start with Assets/');
      }
      if (!scriptPath.endsWith('.cs')) {
        throw new Error('scriptPath must end with .cs');
      }
    }

    // Validate scriptName if provided
    if (scriptName) {
      const classNameRegex = /^[A-Za-z_][A-Za-z0-9_]*$/;
      if (!classNameRegex.test(scriptName)) {
        throw new Error('scriptName must be a valid C# class name (alphanumeric and underscore only, cannot start with number)');
      }

      // Validate searchPath when using scriptName
      if (searchPath && !searchPath.startsWith('Assets/')) {
        throw new Error('searchPath must start with Assets/');
      }
    }
  }

  /**
   * Executes the script reading
   * @param {Object} params - The input parameters
   * @returns {Promise<Object>} The script content and metadata
   */
  async execute(params) {
    const {
      scriptPath,
      scriptName,
      searchPath = 'Assets/',
      includeMetadata = true
    } = params;

    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Prepare command parameters
    const commandParams = {
      includeMetadata
    };

    // Set either scriptPath or scriptName/searchPath
    if (scriptPath) {
      commandParams.scriptPath = scriptPath;
    } else {
      commandParams.scriptName = scriptName;
      commandParams.searchPath = searchPath.endsWith('/') ? searchPath : searchPath + '/';
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('read_script', commandParams);

    // Handle Unity response
    if (response.success === false) {
      throw new Error(response.error || 'Failed to read script');
    }

    // Build result object
    const result = {
      scriptContent: response.scriptContent,
      scriptPath: response.scriptPath
    };

    // Include metadata if requested and available
    if (includeMetadata) {
      if (response.lastModified) {
        result.lastModified = response.lastModified;
      }
      if (response.lineCount !== undefined) {
        result.lineCount = response.lineCount;
      }
      if (response.fileSize !== undefined) {
        result.fileSize = response.fileSize;
      }
      if (response.encoding) {
        result.encoding = response.encoding;
      }
    }

    return result;
  }
}