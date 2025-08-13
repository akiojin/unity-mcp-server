import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for validating C# scripts in Unity
 */
export class ValidateScriptToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'validate_script',
      'Validate a C# script for syntax and Unity compatibility',
      {
        type: 'object',
        properties: {
          scriptPath: {
            type: 'string',
            description: 'Full path to the script file (e.g., Assets/Scripts/PlayerController.cs)'
          },
          scriptContent: {
            type: 'string',
            description: 'Script content to validate directly'
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
          checkSyntax: {
            type: 'boolean',
            default: false,
            description: 'Check for syntax errors'
          },
          checkUnityCompatibility: {
            type: 'boolean',
            default: false,
            description: 'Check for Unity API compatibility'
          },
          suggestImprovements: {
            type: 'boolean',
            default: false,
            description: 'Provide code improvement suggestions'
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
    const { scriptPath, scriptContent, scriptName, searchPath } = params;

    // At least one input method must be provided
    if (!scriptPath && !scriptContent && !scriptName) {
      throw new Error('Either scriptPath, scriptContent, or scriptName must be provided');
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
   * Executes the script validation
   * @param {Object} params - The input parameters
   * @returns {Promise<Object>} The result of the script validation
   */
  async execute(params) {
    const {
      scriptPath,
      scriptContent,
      scriptName,
      searchPath,
      checkSyntax,
      checkUnityCompatibility,
      suggestImprovements
    } = params;

    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Prepare command parameters
    const commandParams = {
      checkSyntax,
      checkUnityCompatibility,
      suggestImprovements
    };

    // Set the input method
    if (scriptPath) {
      commandParams.scriptPath = scriptPath;
    } else if (scriptContent) {
      commandParams.scriptContent = scriptContent;
    } else {
      commandParams.scriptName = scriptName;
      commandParams.searchPath = searchPath.endsWith('/') ? searchPath : searchPath + '/';
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('validate_script', commandParams);

    // Handle Unity response
    if (response.success === false || response.status === 'error') {
      throw new Error(response.error || 'Failed to validate script');
    }

    // Handle nested data structure from Unity
    const data = response.data || response;

    // Build result object
    const result = {
      isValid: data.isValid,
      errors: data.errors || [],
      warnings: data.warnings || [],
      message: data.message || 'Script validation completed'
    };

    // Include optional data if available
    if (data.suggestions && Array.isArray(data.suggestions)) {
      result.suggestions = data.suggestions;
    }
    if (data.scriptPath) {
      result.scriptPath = data.scriptPath;
    }
    if (data.statistics) {
      result.statistics = data.statistics;
    }
    if (data.validationTime !== undefined) {
      result.validationTime = data.validationTime;
    }
    if (data.unityVersion) {
      result.unityVersion = data.unityVersion;
    }

    return result;
  }
}