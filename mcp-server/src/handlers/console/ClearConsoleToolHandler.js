import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for clearing Unity Editor console logs
 */
export class ClearConsoleToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'clear_console',
      'Clear Unity Editor console logs',
      {
        type: 'object',
        properties: {
          clearOnPlay: {
            type: 'boolean',
            default: false,
            description: 'Clear console when entering play mode'
          },
          clearOnRecompile: {
            type: 'boolean',
            default: false,
            description: 'Clear console on script recompilation'
          },
          clearOnBuild: {
            type: 'boolean',
            default: false,
            description: 'Clear console when building'
          },
          preserveWarnings: {
            type: 'boolean',
            default: false,
            description: 'Preserve warning messages when clearing'
          },
          preserveErrors: {
            type: 'boolean',
            default: false,
            description: 'Preserve error messages when clearing'
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
    const {
      clearOnPlay,
      clearOnRecompile,
      clearOnBuild,
      preserveWarnings,
      preserveErrors
    } = params;

    // Validate boolean parameters
    if (clearOnPlay !== undefined && typeof clearOnPlay !== 'boolean') {
      throw new Error('clearOnPlay must be a boolean');
    }

    if (clearOnRecompile !== undefined && typeof clearOnRecompile !== 'boolean') {
      throw new Error('clearOnRecompile must be a boolean');
    }

    if (clearOnBuild !== undefined && typeof clearOnBuild !== 'boolean') {
      throw new Error('clearOnBuild must be a boolean');
    }

    if (preserveWarnings !== undefined && typeof preserveWarnings !== 'boolean') {
      throw new Error('preserveWarnings must be a boolean');
    }

    if (preserveErrors !== undefined && typeof preserveErrors !== 'boolean') {
      throw new Error('preserveErrors must be a boolean');
    }

    // Validate logical consistency
    const isClearing = clearOnPlay !== false || clearOnRecompile !== false || clearOnBuild !== false;
    const isPreserving = preserveWarnings === true || preserveErrors === true;
    
    if (isPreserving && !isClearing) {
      throw new Error('Cannot preserve specific log types when not clearing console');
    }
  }

  /**
   * Executes the console clear operation
   * @param {Object} params - The input parameters
   * @returns {Promise<Object>} The result of the clear operation
   */
  async execute(params) {
    const {
      clearOnPlay = false,
      clearOnRecompile = false,
      clearOnBuild = false,
      preserveWarnings = false,
      preserveErrors = false
    } = params;

    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Prepare command parameters
    const commandParams = {
      clearOnPlay,
      clearOnRecompile,
      clearOnBuild,
      preserveWarnings,
      preserveErrors
    };

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('clear_console', commandParams);

    // Handle Unity response
    if (response.success === false) {
      throw new Error(response.error || 'Failed to clear console');
    }

    // Build result object
    const result = {
      message: response.message || 'Console cleared successfully',
      timestamp: response.timestamp || new Date().toISOString()
    };

    // Include optional statistics if available
    if (response.clearedCount !== undefined) {
      result.clearedCount = response.clearedCount;
    }
    if (response.remainingCount !== undefined) {
      result.remainingCount = response.remainingCount;
    }
    if (response.preservedWarnings !== undefined) {
      result.preservedWarnings = response.preservedWarnings;
    }
    if (response.preservedErrors !== undefined) {
      result.preservedErrors = response.preservedErrors;
    }
    if (response.settingsUpdated !== undefined) {
      result.settingsUpdated = response.settingsUpdated;
    }

    // Include settings if they were updated
    if (response.settingsUpdated) {
      if (response.clearOnPlay !== undefined) {
        result.clearOnPlay = response.clearOnPlay;
      }
      if (response.clearOnRecompile !== undefined) {
        result.clearOnRecompile = response.clearOnRecompile;
      }
      if (response.clearOnBuild !== undefined) {
        result.clearOnBuild = response.clearOnBuild;
      }
    }

    return result;
  }
}