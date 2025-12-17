import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for clearing Unity Editor console logs
 */
export class ConsoleClearToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('clear_console', 'Clear Console logs (optionally set auto-clear and preserve levels).', {
      type: 'object',
      properties: {
        clearOnPlay: {
          type: 'boolean',
          description:
            'Clear console when entering play mode. Unity default: false. Set to true for cleaner testing sessions'
        },
        clearOnRecompile: {
          type: 'boolean',
          description:
            'Clear console on script recompilation. Unity default: false. Set to true to focus on current compilation errors'
        },
        clearOnBuild: {
          type: 'boolean',
          description:
            'Clear console when building. Unity default: false. Set to true for clean build logs'
        },
        preserveWarnings: {
          type: 'boolean',
          description: 'Preserve warning messages when clearing (default: false)'
        },
        preserveErrors: {
          type: 'boolean',
          description: 'Preserve error messages when clearing (default: false)'
        }
      },
      required: []
    });

    this.unityConnection = unityConnection;
  }

  /**
   * Validates the input parameters
   * @param {Object} params - The input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    const { clearOnPlay, clearOnRecompile, clearOnBuild, preserveWarnings, preserveErrors } =
      params;

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
    const isClearing =
      clearOnPlay !== false || clearOnRecompile !== false || clearOnBuild !== false;
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
    const { clearOnPlay, clearOnRecompile, clearOnBuild, preserveWarnings, preserveErrors } =
      params;

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
