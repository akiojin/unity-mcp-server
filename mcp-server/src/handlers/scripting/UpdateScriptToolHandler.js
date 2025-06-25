import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for updating C# scripts in Unity
 */
export class UpdateScriptToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'update_script',
      'Update an existing C# script in Unity project',
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
          scriptContent: {
            type: 'string',
            description: 'New content for the script'
          },
          updateMode: {
            type: 'string',
            enum: ['replace', 'append', 'prepend'],
            default: 'replace',
            description: 'How to update the script content'
          },
          createBackup: {
            type: 'boolean',
            default: false,
            description: 'Whether to create a backup before updating'
          }
        },
        required: ['scriptContent']
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
    const { scriptPath, scriptName, searchPath, scriptContent, updateMode } = params;

    // scriptContent is required
    if (!scriptContent) {
      throw new Error('scriptContent is required');
    }

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

    // Validate updateMode if provided
    if (updateMode && !['replace', 'append', 'prepend'].includes(updateMode)) {
      throw new Error('updateMode must be one of: replace, append, prepend');
    }
  }

  /**
   * Executes the script update
   * @param {Object} params - The input parameters
   * @returns {Promise<Object>} The result of the script update
   */
  async execute(params) {
    const {
      scriptPath,
      scriptName,
      searchPath = 'Assets/',
      scriptContent,
      updateMode = 'replace',
      createBackup = false
    } = params;

    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Prepare command parameters
    const commandParams = {
      scriptContent,
      updateMode,
      createBackup
    };

    // Set either scriptPath or scriptName/searchPath
    if (scriptPath) {
      commandParams.scriptPath = scriptPath;
    } else {
      commandParams.scriptName = scriptName;
      commandParams.searchPath = searchPath.endsWith('/') ? searchPath : searchPath + '/';
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('update_script', commandParams);

    // Handle Unity response
    if (response.success === false || response.status === 'error') {
      throw new Error(response.error || 'Failed to update script');
    }

    // Handle nested data structure from Unity
    const data = response.data || response;

    // Build result object
    const result = {
      scriptPath: data.scriptPath,
      message: data.message || 'Script updated successfully'
    };

    // Include optional metadata if available
    if (data.linesChanged !== undefined) {
      result.linesChanged = data.linesChanged;
    }
    if (data.backupPath) {
      result.backupPath = data.backupPath;
    }
    if (data.previousSize !== undefined) {
      result.previousSize = data.previousSize;
    }
    if (data.newSize !== undefined) {
      result.newSize = data.newSize;
    }

    return result;
  }
}