import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for deleting C# scripts in Unity
 */
export class DeleteScriptToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'delete_script',
      'Delete a C# script from Unity project',
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
          createBackup: {
            type: 'boolean',
            default: false,
            description: 'Whether to create a backup before deleting'
          },
          force: {
            type: 'boolean',
            default: false,
            description: 'Force deletion without confirmation'
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
   * Executes the script deletion
   * @param {Object} params - The input parameters
   * @returns {Promise<Object>} The result of the script deletion
   */
  async execute(params) {
    const {
      scriptPath,
      scriptName,
      searchPath = 'Assets/',
      createBackup = false,
      force = false
    } = params;

    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Prepare command parameters
    const commandParams = {
      createBackup,
      force
    };

    // Set either scriptPath or scriptName/searchPath
    if (scriptPath) {
      commandParams.scriptPath = scriptPath;
    } else {
      commandParams.scriptName = scriptName;
      commandParams.searchPath = searchPath.endsWith('/') ? searchPath : searchPath + '/';
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('delete_script', commandParams);

    // Handle Unity response
    if (response.success === false) {
      throw new Error(response.error || 'Failed to delete script');
    }

    // Build result object
    const result = {
      message: response.message || 'Script deleted successfully'
    };

    // Handle single or multiple deletions
    if (response.deletedPaths && Array.isArray(response.deletedPaths)) {
      result.deletedPaths = response.deletedPaths;
    } else if (response.scriptPath) {
      result.scriptPath = response.scriptPath;
    }

    // Include optional metadata if available
    if (response.backupPath) {
      result.backupPath = response.backupPath;
    }
    if (response.fileSize !== undefined) {
      result.fileSize = response.fileSize;
    }
    if (response.lastModified) {
      result.lastModified = response.lastModified;
    }
    if (response.deletedCount !== undefined) {
      result.deletedCount = response.deletedCount;
    }

    return result;
  }
}