import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for retrieving Unity project settings
 */
export class SettingsGetToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'settings_get',
      'Get project settings by category via include flags (player/graphics/quality/physics/etc.).',
      {
        type: 'object',
        properties: {
          includePlayer: {
            type: 'boolean',
            description: 'Include player settings (company/product name, version, etc.) (default: true).'
          },
          includeGraphics: {
            type: 'boolean',
            description: 'Include graphics settings (color space, render pipeline, etc.) (default: false).'
          },
          includeQuality: {
            type: 'boolean',
            description: 'Include quality settings (levels, anti-aliasing, shadows, etc.) (default: false).'
          },
          includePhysics: {
            type: 'boolean',
            description: 'Include 3D physics settings (gravity, solver iterations, etc.) (default: false).'
          },
          includePhysics2D: {
            type: 'boolean',
            description: 'Include 2D physics settings (default: false).'
          },
          includeAudio: {
            type: 'boolean',
            description: 'Include audio settings (speaker mode, DSP buffer, volume, etc.) (default: false).'
          },
          includeTime: {
            type: 'boolean',
            description: 'Include time settings (fixed timestep, time scale, etc.) (default: false).'
          },
          includeInputManager: {
            type: 'boolean',
            description: 'Include input manager settings (legacy input system) (default: false).'
          },
          includeEditor: {
            type: 'boolean',
            description: 'Include editor settings (Unity Remote, serialization mode, etc.) (default: false).'
          },
          includeBuild: {
            type: 'boolean',
            description: 'Include build settings (scenes in build, build target, etc.) (default: false).'
          },
          includeTags: {
            type: 'boolean',
            description: 'Include tags, layers, and sorting layers (default: false).'
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
    // All parameters are optional booleans with defaults, no special validation needed
    const booleanParams = [
      'includePlayer', 'includeGraphics', 'includeQuality',
      'includePhysics', 'includePhysics2D', 'includeAudio',
      'includeTime', 'includeInputManager', 'includeEditor',
      'includeBuild', 'includeTags'
    ];

    for (const param of booleanParams) {
      if (params[param] !== undefined && typeof params[param] !== 'boolean') {
        throw new Error(`${param} must be a boolean value`);
      }
    }
  }

  /**
   * Executes the get project settings operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The project settings
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('get_project_settings', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return the settings object
    return response;
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      getBasicSettings: {
        description: 'Get basic player settings only (default)',
        params: {}
      },
      getGraphicsAndQuality: {
        description: 'Get graphics and quality settings',
        params: {
          includeGraphics: true,
          includeQuality: true
        }
      },
      getPhysicsSettings: {
        description: 'Get all physics-related settings',
        params: {
          includePhysics: true,
          includePhysics2D: true,
          includeTime: true
        }
      },
      getEditorSettings: {
        description: 'Get editor and build configuration',
        params: {
          includeEditor: true,
          includeBuild: true,
          includeTags: true
        }
      },
      getAllSettings: {
        description: 'Get all available settings',
        params: {
          includePlayer: true,
          includeGraphics: true,
          includeQuality: true,
          includePhysics: true,
          includePhysics2D: true,
          includeAudio: true,
          includeTime: true,
          includeInputManager: true,
          includeEditor: true,
          includeBuild: true,
          includeTags: true
        }
      }
    };
  }
}
