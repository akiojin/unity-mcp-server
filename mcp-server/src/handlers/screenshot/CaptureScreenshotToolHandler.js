import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for capturing screenshots from Unity Editor
 */
export class CaptureScreenshotToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'capture_screenshot',
      'Capture screenshots from Unity Editor (Game View, Scene View, Explorer mode, or specific windows)',
      {
        type: 'object',
        properties: {
          outputPath: {
            type: 'string',
            description: 'Path to save the screenshot (e.g., "Assets/Screenshots/capture.png"). If not provided, auto-generates with timestamp'
          },
          captureMode: {
            type: 'string',
            enum: ['game', 'scene', 'window', 'explorer'],
            default: 'game',
            description: 'What to capture: game (Game View), scene (Scene View), explorer (LLM exploration mode), or window (specific editor window)'
          },
          width: {
            type: 'number',
            description: 'Custom width for the screenshot (0 = use current view size)'
          },
          height: {
            type: 'number',
            description: 'Custom height for the screenshot (0 = use current view size)'
          },
          includeUI: {
            type: 'boolean',
            default: true,
            description: 'Include UI elements in the screenshot (Game View only)'
          },
          windowName: {
            type: 'string',
            description: 'Name of the window to capture (required when captureMode is "window")'
          },
          encodeAsBase64: {
            type: 'boolean',
            default: false,
            description: 'Return the screenshot data as base64 encoded string'
          },
          explorerSettings: {
            type: 'object',
            description: 'Settings for explorer mode (LLM exploration)',
            properties: {
              target: {
                type: 'object',
                description: 'Target configuration for explorer mode',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['gameObject', 'tag', 'area', 'position'],
                    description: 'Type of target: gameObject (by name), tag (by tag), area (center + radius), position (manual)'
                  },
                  name: {
                    type: 'string',
                    description: 'Name of the GameObject to target (for gameObject type)'
                  },
                  tag: {
                    type: 'string',
                    description: 'Tag to search for GameObjects (for tag type)'
                  },
                  center: {
                    type: 'object',
                    description: 'Center position for area type',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                      z: { type: 'number' }
                    }
                  },
                  radius: {
                    type: 'number',
                    description: 'Radius for area type'
                  },
                  includeChildren: {
                    type: 'boolean',
                    default: true,
                    description: 'Include children when calculating bounds'
                  }
                }
              },
              camera: {
                type: 'object',
                description: 'Camera configuration for explorer mode',
                properties: {
                  position: {
                    type: 'object',
                    description: 'Camera position',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                      z: { type: 'number' }
                    }
                  },
                  lookAt: {
                    type: 'object',
                    description: 'Point to look at',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                      z: { type: 'number' }
                    }
                  },
                  rotation: {
                    type: 'object',
                    description: 'Camera rotation in Euler angles',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                      z: { type: 'number' }
                    }
                  },
                  fieldOfView: {
                    type: 'number',
                    default: 60,
                    description: 'Field of view in degrees'
                  },
                  nearClip: {
                    type: 'number',
                    default: 0.3,
                    description: 'Near clipping plane'
                  },
                  farClip: {
                    type: 'number',
                    default: 1000,
                    description: 'Far clipping plane'
                  },
                  autoFrame: {
                    type: 'boolean',
                    default: true,
                    description: 'Automatically frame the target'
                  },
                  padding: {
                    type: 'number',
                    default: 0.2,
                    description: 'Padding for auto-framing (0-1)'
                  },
                  offset: {
                    type: 'object',
                    description: 'Offset from calculated position',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                      z: { type: 'number' }
                    }
                  },
                  width: {
                    type: 'number',
                    default: 1920,
                    description: 'Resolution width for explorer capture'
                  },
                  height: {
                    type: 'number',
                    default: 1080,
                    description: 'Resolution height for explorer capture'
                  }
                }
              },
              display: {
                type: 'object',
                description: 'Display settings for explorer mode',
                properties: {
                  backgroundColor: {
                    type: 'object',
                    description: 'Background color',
                    properties: {
                      r: { type: 'number', default: 0.2 },
                      g: { type: 'number', default: 0.2 },
                      b: { type: 'number', default: 0.2 },
                      a: { type: 'number', default: 1 }
                    }
                  },
                  layers: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Layer names to include in rendering'
                  },
                  showGizmos: {
                    type: 'boolean',
                    default: false,
                    description: 'Show gizmos in the capture'
                  },
                  showColliders: {
                    type: 'boolean',
                    default: false,
                    description: 'Show colliders in the capture'
                  },
                  showBounds: {
                    type: 'boolean',
                    default: false,
                    description: 'Show object bounds'
                  },
                  highlightTarget: {
                    type: 'boolean',
                    default: false,
                    description: 'Highlight the target object'
                  }
                }
              }
            }
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
    const { captureMode = 'game', windowName, outputPath, explorerSettings } = params;

    // Validate capture mode
    if (!['game', 'scene', 'window', 'explorer'].includes(captureMode)) {
      throw new Error('captureMode must be one of: game, scene, window, explorer');
    }

    // Window mode requires windowName
    if (captureMode === 'window' && !windowName) {
      throw new Error('windowName is required when captureMode is "window"');
    }

    // Explorer mode validation
    if (captureMode === 'explorer' && explorerSettings) {
      const { target, camera, display } = explorerSettings;
      
      // Validate target settings
      if (target) {
        const { type } = target;
        if (type && !['gameObject', 'tag', 'area', 'position'].includes(type)) {
          throw new Error('target.type must be one of: gameObject, tag, area, position');
        }
        
        if (type === 'gameObject' && !target.name) {
          throw new Error('target.name is required when target.type is "gameObject"');
        }
        
        if (type === 'tag' && !target.tag) {
          throw new Error('target.tag is required when target.type is "tag"');
        }
        
        if (type === 'area' && !target.center) {
          throw new Error('target.center is required when target.type is "area"');
        }
      }
      
      // Validate camera settings
      if (camera) {
        if (camera.fieldOfView !== undefined && (camera.fieldOfView < 1 || camera.fieldOfView > 179)) {
          throw new Error('camera.fieldOfView must be between 1 and 179');
        }
        
        if (camera.padding !== undefined && (camera.padding < 0 || camera.padding > 1)) {
          throw new Error('camera.padding must be between 0 and 1');
        }
        
        if (camera.width !== undefined && (camera.width < 1 || camera.width > 8192)) {
          throw new Error('camera.width must be between 1 and 8192');
        }
        
        if (camera.height !== undefined && (camera.height < 1 || camera.height > 8192)) {
          throw new Error('camera.height must be between 1 and 8192');
        }
      }
    }

    // Validate output path if provided
    if (outputPath) {
      if (!outputPath.endsWith('.png') && !outputPath.endsWith('.jpg') && !outputPath.endsWith('.jpeg')) {
        throw new Error('outputPath must end with .png, .jpg, or .jpeg');
      }
      
      if (!outputPath.startsWith('Assets/')) {
        throw new Error('outputPath must be within the Assets folder');
      }
    }

    // Validate dimensions if provided (for non-explorer modes)
    if (captureMode !== 'explorer') {
      if (params.width !== undefined && (params.width < 0 || params.width > 8192)) {
        throw new Error('width must be between 0 and 8192');
      }
      
      if (params.height !== undefined && (params.height < 0 || params.height > 8192)) {
        throw new Error('height must be between 0 and 8192');
      }
    }
  }

  /**
   * Executes the screenshot capture
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The screenshot capture result
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send capture command to Unity
    const response = await this.unityConnection.sendCommand('capture_screenshot', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Build result object
    const result = {
      path: response.path,
      width: response.width,
      height: response.height,
      captureMode: response.captureMode,
      fileSize: response.fileSize,
      message: response.message || 'Screenshot captured successfully'
    };

    // Include optional fields if present
    if (response.includeUI !== undefined) {
      result.includeUI = response.includeUI;
    }

    if (response.cameraPosition) {
      result.cameraPosition = response.cameraPosition;
    }

    if (response.cameraRotation) {
      result.cameraRotation = response.cameraRotation;
    }

    if (response.base64Data) {
      result.base64Data = response.base64Data;
    }

    return result;
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      captureGameView: {
        description: 'Capture the Game View (user perspective)',
        params: {
          captureMode: 'game',
          includeUI: true
        }
      },
      captureSceneView: {
        description: 'Capture the Scene View at specific resolution',
        params: {
          captureMode: 'scene',
          width: 1920,
          height: 1080,
          outputPath: 'Assets/Screenshots/scene_capture.png'
        }
      },
      captureWithBase64: {
        description: 'Capture and return as base64 for immediate analysis',
        params: {
          captureMode: 'game',
          encodeAsBase64: true
        }
      },
      captureConsoleWindow: {
        description: 'Capture a specific editor window',
        params: {
          captureMode: 'window',
          windowName: 'Console'
        }
      },
      explorerCaptureGameObject: {
        description: 'Explorer mode: Capture a specific GameObject (LLM perspective)',
        params: {
          captureMode: 'explorer',
          explorerSettings: {
            target: {
              type: 'gameObject',
              name: 'Player',
              includeChildren: true
            },
            camera: {
              autoFrame: true,
              padding: 0.2
            }
          }
        }
      },
      explorerCaptureByTag: {
        description: 'Explorer mode: Capture all objects with a specific tag',
        params: {
          captureMode: 'explorer',
          explorerSettings: {
            target: {
              type: 'tag',
              tag: 'Enemy'
            },
            camera: {
              autoFrame: true
            }
          }
        }
      },
      explorerCaptureArea: {
        description: 'Explorer mode: Capture a specific area from above',
        params: {
          captureMode: 'explorer',
          explorerSettings: {
            target: {
              type: 'area',
              center: { x: 0, y: 0, z: 0 },
              radius: 20
            }
          }
        }
      },
      explorerManualCamera: {
        description: 'Explorer mode: Manual camera positioning',
        params: {
          captureMode: 'explorer',
          explorerSettings: {
            camera: {
              position: { x: 10, y: 5, z: -10 },
              lookAt: { x: 0, y: 0, z: 0 },
              fieldOfView: 45
            },
            display: {
              backgroundColor: { r: 0.1, g: 0.1, b: 0.2 },
              layers: ['Default', 'Player', 'Enemies']
            }
          }
        }
      }
    };
  }
}