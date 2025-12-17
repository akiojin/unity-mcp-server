import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for updating Unity project settings with safety confirmation
 */
export class SettingsUpdateToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'update_project_settings',
      'Update project settings by category with a confirmation safety flag.',
      {
        type: 'object',
        properties: {
          confirmChanges: {
            type: 'boolean',
            description: 'Safety flag: must be true to apply changes (prevents accidental edits).'
          },
          player: {
            type: 'object',
            description: 'Player settings (company/product name, bundle version, windowing).',
            properties: {
              companyName: { type: 'string', description: 'Company name' },
              productName: { type: 'string', description: 'Product name' },
              version: { type: 'string', description: 'Bundle version' },
              defaultScreenWidth: { type: 'number', description: 'Default screen width' },
              defaultScreenHeight: { type: 'number', description: 'Default screen height' },
              runInBackground: { type: 'boolean', description: 'Allow running in background' }
            }
          },
          graphics: {
            type: 'object',
            description: 'Graphics settings (color space, render pipeline, etc.).',
            properties: {
              colorSpace: {
                type: 'string',
                enum: ['Gamma', 'Linear'],
                description: 'Color space (requires Unity restart)'
              }
            }
          },
          physics: {
            type: 'object',
            description: '3D physics settings (gravity, solver iterations, thresholds).',
            properties: {
              gravity: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  z: { type: 'number' }
                }
              },
              defaultSolverIterations: { type: 'number' },
              defaultSolverVelocityIterations: { type: 'number' },
              bounceThreshold: { type: 'number' },
              sleepThreshold: { type: 'number' },
              defaultContactOffset: { type: 'number' }
            }
          },
          physics2D: {
            type: 'object',
            description: '2D physics settings (gravity, iterations, thresholds).',
            properties: {
              gravity: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' }
                }
              },
              velocityIterations: { type: 'number' },
              positionIterations: { type: 'number' },
              velocityThreshold: { type: 'number' }
            }
          },
          audio: {
            type: 'object',
            description: 'Audio settings (global volume).',
            properties: {
              globalVolume: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Global volume (0-1)'
              }
            }
          },
          time: {
            type: 'object',
            description: 'Time settings (fixed timestep, time scale).',
            properties: {
              fixedDeltaTime: { type: 'number', description: 'Fixed timestep' },
              timeScale: { type: 'number', minimum: 0, description: 'Time scale (0 = paused)' },
              maximumDeltaTime: { type: 'number', description: 'Maximum allowed timestep' }
            }
          },
          quality: {
            type: 'object',
            description: 'Quality settings (levels, vSync, AA, shadows).',
            properties: {
              currentLevel: { type: 'string', description: 'Quality level name' },
              vSyncCount: {
                type: 'number',
                minimum: 0,
                maximum: 4,
                description: 'VSync count (0=off, 1=every VBlank, 2=every second VBlank)'
              },
              antiAliasing: {
                type: 'number',
                enum: [0, 2, 4, 8],
                description: 'Anti-aliasing samples'
              },
              shadowDistance: {
                type: 'number',
                minimum: 0,
                description: 'Shadow rendering distance'
              }
            }
          }
        },
        required: ['confirmChanges']
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
    // Require explicit confirmation
    if (!params.confirmChanges) {
      throw new Error(
        'confirmChanges must be set to true to update settings. This is a safety measure to prevent accidental changes.'
      );
    }

    // Check that at least one settings category is provided
    const settingsCategories = [
      'player',
      'graphics',
      'physics',
      'physics2D',
      'audio',
      'time',
      'quality'
    ];
    const hasSettings = settingsCategories.some(cat => params[cat] !== undefined);

    if (!hasSettings) {
      throw new Error('At least one settings category must be provided to update');
    }

    // Validate specific settings
    if (params.audio?.globalVolume !== undefined) {
      const volume = params.audio.globalVolume;
      if (typeof volume !== 'number' || volume < 0 || volume > 1) {
        throw new Error('globalVolume must be a number between 0 and 1');
      }
    }

    if (params.quality?.vSyncCount !== undefined) {
      const vSync = params.quality.vSyncCount;
      if (!Number.isInteger(vSync) || vSync < 0 || vSync > 4) {
        throw new Error('vSyncCount must be an integer between 0 and 4');
      }
    }

    if (params.quality?.antiAliasing !== undefined) {
      const aa = params.quality.antiAliasing;
      if (![0, 2, 4, 8].includes(aa)) {
        throw new Error('antiAliasing must be 0, 2, 4, or 8');
      }
    }

    if (params.graphics?.colorSpace !== undefined) {
      const colorSpace = params.graphics.colorSpace;
      if (!['Gamma', 'Linear'].includes(colorSpace)) {
        throw new Error('colorSpace must be either "Gamma" or "Linear"');
      }
    }

    if (params.time?.timeScale !== undefined) {
      const timeScale = params.time.timeScale;
      if (typeof timeScale !== 'number' || timeScale < 0) {
        throw new Error('timeScale must be a non-negative number');
      }
    }
  }

  /**
   * Executes the update project settings operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The update results
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('update_project_settings', params);

    // Handle Unity response
    if (response.error) {
      // Check for specific error codes
      if (response.code === 'CONFIRMATION_REQUIRED') {
        throw new Error('Settings update requires confirmation. Set confirmChanges to true.');
      }
      throw new Error(response.error);
    }

    // Return the update results
    return response;
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      updatePlayerSettings: {
        description: 'Update player settings like company and product name',
        params: {
          confirmChanges: true,
          player: {
            companyName: 'My Company',
            productName: 'My Game',
            version: '1.0.0'
          }
        }
      },
      updatePhysicsSettings: {
        description: 'Update physics settings like gravity',
        params: {
          confirmChanges: true,
          physics: {
            gravity: { x: 0, y: -9.81, z: 0 },
            defaultSolverIterations: 10
          }
        }
      },
      updateQualitySettings: {
        description: 'Update quality settings',
        params: {
          confirmChanges: true,
          quality: {
            vSyncCount: 1,
            antiAliasing: 4,
            shadowDistance: 150
          }
        }
      },
      updateMultipleCategories: {
        description: 'Update multiple settings categories at once',
        params: {
          confirmChanges: true,
          player: {
            version: '2.0.0'
          },
          audio: {
            globalVolume: 0.8
          },
          time: {
            timeScale: 1.0,
            fixedDeltaTime: 0.02
          }
        }
      },
      safetyCheckExample: {
        description: 'Example showing safety check (will fail)',
        params: {
          confirmChanges: false, // This will trigger safety check
          player: {
            productName: 'Accidental Change'
          }
        }
      }
    };
  }
}
