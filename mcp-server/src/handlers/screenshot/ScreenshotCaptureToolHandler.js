import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for capturing screenshots from Unity Editor
 */
export class ScreenshotCaptureToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'screenshot_capture',
      'Capture Game/Scene/Window/Explorer screenshots. Output path is fixed to <workspace>/.unity/capture/. For LLM use, prefer explorer mode (auto-framing, clarity). Use encodeAsBase64=true only for immediate analysis, and keep resolution minimal.',
      {
        type: 'object',
        properties: {
          captureMode: {
            type: 'string',
            enum: ['game', 'scene', 'window', 'explorer'],
            description: 'Capture mode selection:\n- "game": Game View (player\'s perspective, what the user sees)\n- "scene": Scene View (editor\'s 3D workspace view)\n- "explorer": AI/LLM exploration mode (optimized view for understanding scene content)\n- "window": Specific Unity Editor window by name'
          },
          width: {
            type: 'number',
            description: 'Screenshot width in pixels (0 = use current view size). Range: 1-8192. Not applicable for explorer mode (use explorerSettings.camera.width instead)'
          },
          height: {
            type: 'number',
            description: 'Screenshot height in pixels (0 = use current view size). Range: 1-8192. Not applicable for explorer mode (use explorerSettings.camera.height instead)'
          },
          includeUI: {
            type: 'boolean',
            description: 'Whether to include UI overlay elements in Game View captures. Set to false for clean gameplay screenshots (default: true)'
          },
          windowName: {
            type: 'string',
            description: 'Name of the Unity Editor window to capture (required when captureMode is "window"). Examples: "Console", "Inspector", "Hierarchy", "Project"'
          },
          encodeAsBase64: {
            type: 'boolean',
            description: 'Return screenshot data as base64 string for immediate processing/analysis without file I/O (default: false)'
          },
          explorerSettings: {
            type: 'object',
            description: 'Configuration for explorer mode - AI/LLM optimized capture settings',
            properties: {
              target: {
                type: 'object',
                description: 'Defines what to focus on in the scene',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['gameObject', 'tag', 'area', 'position'],
                    description: 'Target selection method:\n- "gameObject": Focus on a specific GameObject by name\n- "tag": Focus on all objects with a specific tag\n- "area": Focus on a circular area defined by center and radius\n- "position": Manual camera positioning without auto-framing'
                  },
                  name: {
                    type: 'string',
                    description: 'GameObject name to target (required for "gameObject" type). Example: "Player", "MainCamera", "Enemy_01"'
                  },
                  tag: {
                    type: 'string',
                    description: 'Tag to search for GameObjects (required for "tag" type). Example: "Enemy", "Collectible", "Player"'
                  },
                  center: {
                    type: 'object',
                    description: 'Center position for area targeting (required for "area" type)',
                    properties: {
                      x: { type: 'number', description: 'X coordinate in world space' },
                      y: { type: 'number', description: 'Y coordinate in world space' },
                      z: { type: 'number', description: 'Z coordinate in world space' }
                    }
                  },
                  radius: {
                    type: 'number',
                    description: 'Radius around center for area targeting (used with "area" type). Defines the circular area to capture'
                  },
                  includeChildren: {
                    type: 'boolean',
                    description: 'Include child objects when calculating the target bounds for framing (default: true)'
                  }
                }
              },
              camera: {
                type: 'object',
                description: 'Camera configuration for the capture',
                properties: {
                  position: {
                    type: 'object',
                    description: 'Manual camera position in world space (overrides auto-framing)',
                    properties: {
                      x: { type: 'number', description: 'X position in world units' },
                      y: { type: 'number', description: 'Y position in world units' },
                      z: { type: 'number', description: 'Z position in world units' }
                    }
                  },
                  lookAt: {
                    type: 'object',
                    description: 'Point for camera to look at in world space',
                    properties: {
                      x: { type: 'number', description: 'X coordinate to look at' },
                      y: { type: 'number', description: 'Y coordinate to look at' },
                      z: { type: 'number', description: 'Z coordinate to look at' }
                    }
                  },
                  rotation: {
                    type: 'object',
                    description: 'Camera rotation in Euler angles (alternative to lookAt)',
                    properties: {
                      x: { type: 'number', description: 'X rotation (pitch) in degrees' },
                      y: { type: 'number', description: 'Y rotation (yaw) in degrees' },
                      z: { type: 'number', description: 'Z rotation (roll) in degrees' }
                    }
                  },
                  fieldOfView: {
                    type: 'number',
                    
                    description: 'Camera field of view in degrees (1-179). Lower values zoom in, higher values zoom out'
                  },
                  nearClip: {
                    type: 'number',
                    description: 'Near clipping plane distance. Objects closer than this won\'t be rendered (default: 0.3)'
                  },
                  farClip: {
                    type: 'number',
                    description: 'Far clipping plane distance. Objects farther than this won\'t be rendered'
                  },
                  autoFrame: {
                    type: 'boolean',
                    description: 'Automatically position camera to frame the target. Disable for manual positioning (default: true)'
                  },
                  padding: {
                    type: 'number',
                    description: 'Padding around target when auto-framing (0-1). 0 = tight fit, 1 = lots of space (default: 0.2)'
                  },
                  offset: {
                    type: 'object',
                    description: 'Additional offset from calculated auto-frame position',
                    properties: {
                      x: { type: 'number', description: 'X offset in world units' },
                      y: { type: 'number', description: 'Y offset in world units' },
                      z: { type: 'number', description: 'Z offset in world units' }
                    }
                  },
                  width: {
                    type: 'number',
                    description: 'Capture resolution width in pixels (1-8192)'
                  },
                  height: {
                    type: 'number',
                    description: 'Capture resolution height in pixels (1-8192)'
                  }
                }
              },
              display: {
                type: 'object',
                description: 'Visual display settings for the capture',
                properties: {
                  backgroundColor: {
                    type: 'object',
                    description: 'Background color for the capture (RGBA values 0-1)',
                    properties: {
                      r: { type: 'number', description: 'Red component (0-1, default: 0.2)' },
                      g: { type: 'number', description: 'Green component (0-1, default: 0.2)' },
                      b: { type: 'number', description: 'Blue component (0-1, default: 0.2)' },
                      a: { type: 'number', description: 'Alpha/opacity (0-1, default: 1)' }
                    }
                  },
                  layers: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Unity layer names to include in rendering. If not specified, all layers are included. Examples: ["Default", "UI", "Player"]'
                  },
                  showGizmos: {
                    type: 'boolean',
                    description: 'Show editor gizmos (transform handles, icons) in the capture (default: false)'
                  },
                  showColliders: {
                    type: 'boolean',
                    description: 'Visualize physics colliders as wireframes (default: false)'
                  },
                  showBounds: {
                    type: 'boolean',
                    description: 'Show bounding boxes around objects (default: false)'
                  },
                  highlightTarget: {
                    type: 'boolean',
                    description: 'Highlight the target object(s) with an outline or color (default: false)'
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
      throw new Error(
        'Invalid captureMode. Must be one of: "game" (Game View), "scene" (Scene View), "window" (specific editor window), or "explorer" (AI/LLM exploration mode)'
      );
    }

    // Window mode requires windowName
    if (captureMode === 'window' && !windowName) {
      throw new Error(
        'windowName is required when captureMode is "window". ' +
        'Specify the name of the Unity Editor window to capture (e.g., "Console", "Inspector", "Hierarchy")'
      );
    }

    // Explorer mode validation
    if (captureMode === 'explorer' && explorerSettings) {
      const { target, camera, display } = explorerSettings;
      
      // Validate target settings
      if (target) {
        const { type } = target;
        if (type && !['gameObject', 'tag', 'area', 'position'].includes(type)) {
          throw new Error(
            'Invalid target.type for explorer mode. Must be one of:\n' +
            '- "gameObject": Focus on a specific GameObject by name\n' +
            '- "tag": Focus on all objects with a specific tag\n' +
            '- "area": Focus on a circular area (center + radius)\n' +
            '- "position": Manual camera positioning'
          );
        }
        
        if (type === 'gameObject' && !target.name) {
          throw new Error(
            'target.name is required when target.type is "gameObject". ' +
            'Specify the name of the GameObject to focus on (e.g., "Player", "MainCamera")'
          );
        }
        
        if (type === 'tag' && !target.tag) {
          throw new Error(
            'target.tag is required when target.type is "tag". ' +
            'Specify the tag to search for (e.g., "Enemy", "Collectible")'
          );
        }
        
        if (type === 'area') {
          if (!target.center) {
            throw new Error(
              'target.center is required when target.type is "area". ' +
              'Specify the center position as {x, y, z} in world coordinates'
            );
          }
          if (target.radius === undefined || target.radius <= 0) {
            throw new Error(
              'target.radius must be a positive number when target.type is "area". ' +
              'Specify the radius of the area to capture'
            );
          }
        }
      }
      
      // Validate camera settings
      if (camera) {
        if (camera.fieldOfView !== undefined) {
          if (camera.fieldOfView < 1 || camera.fieldOfView > 179) {
            throw new Error(
              'camera.fieldOfView must be between 1 and 179 degrees. ' +
              'Lower values (20-40) provide zoom effect, standard is 60, wide angle is 90+'
            );
          }
        }
        
        if (camera.padding !== undefined) {
          if (camera.padding < 0 || camera.padding > 1) {
            throw new Error(
              'camera.padding must be between 0 and 1. ' +
              '0 = tight framing, 0.2 = normal padding, 0.5+ = lots of surrounding space'
            );
          }
        }
        
        if (camera.width !== undefined) {
          if (camera.width < 1 || camera.width > 8192) {
            throw new Error(
              'camera.width must be between 1 and 8192 pixels. ' +
              'Common values: 1920 (Full HD), 2560 (2K), 3840 (4K)'
            );
          }
        }
        
        if (camera.height !== undefined) {
          if (camera.height < 1 || camera.height > 8192) {
            throw new Error(
              'camera.height must be between 1 and 8192 pixels. ' +
              'Common values: 1080 (Full HD), 1440 (2K), 2160 (4K)'
            );
          }
        }
        
        if (camera.nearClip !== undefined && camera.nearClip <= 0) {
          throw new Error(
            'camera.nearClip must be a positive number. ' +
            'Typically 0.01 to 1.0 for close-up views, 0.3 is default'
          );
        }
        
        if (camera.farClip !== undefined && camera.farClip <= 0) {
          throw new Error(
            'camera.farClip must be a positive number. ' +
            'Should be larger than nearClip. Default is 1000, reduce for performance'
          );
        }
        
        if (camera.nearClip !== undefined && camera.farClip !== undefined) {
          if (camera.nearClip >= camera.farClip) {
            throw new Error(
              'camera.nearClip must be less than camera.farClip. ' +
              'nearClip defines the closest visible distance, farClip the farthest'
            );
          }
        }
      }
      
      // Validate display settings
      if (display) {
        if (display.backgroundColor) {
          const { r, g, b, a } = display.backgroundColor;
          const validateColorComponent = (value, name) => {
            if (value !== undefined && (value < 0 || value > 1)) {
              throw new Error(
                `backgroundColor.${name} must be between 0 and 1. ` +
                'Color components use normalized values (0 = black/transparent, 1 = full intensity)'
              );
            }
          };
          validateColorComponent(r, 'r');
          validateColorComponent(g, 'g');
          validateColorComponent(b, 'b');
          validateColorComponent(a, 'a');
        }
        
        if (display.layers && !Array.isArray(display.layers)) {
          throw new Error(
            'display.layers must be an array of layer names. ' +
            'Example: ["Default", "UI", "Player"]'
          );
        }
      }
    }

    // Validate output path if provided
    if (outputPath) {
      const validExtensions = ['.png', '.jpg', '.jpeg'];
      const hasValidExtension = validExtensions.some(ext => outputPath.toLowerCase().endsWith(ext));
      
      if (!hasValidExtension) {
        throw new Error(
          'outputPath must end with .png, .jpg, or .jpeg. ' +
          'PNG is recommended for best quality, JPG for smaller file size'
        );
      }
      
      if (!outputPath.startsWith('Assets/')) {
        throw new Error(
          'outputPath must be within the Assets folder. ' +
          'Example: "Assets/Screenshots/capture.png"'
        );
      }
      
      // Warn about potential path issues
      if (outputPath.includes('\\')) {
        throw new Error(
          'outputPath should use forward slashes (/) not backslashes (\\). ' +
          'Example: "Assets/Screenshots/capture.png"'
        );
      }
    }

    // Validate dimensions for non-explorer modes
    if (captureMode !== 'explorer') {
      if (params.width !== undefined) {
        if (params.width < 0 || params.width > 8192) {
          throw new Error(
            'width must be between 0 and 8192 pixels. ' +
            '0 = use current view size, common values: 1920, 2560, 3840'
          );
        }
      }
      
      if (params.height !== undefined) {
        if (params.height < 0 || params.height > 8192) {
          throw new Error(
            'height must be between 0 and 8192 pixels. ' +
            '0 = use current view size, common values: 1080, 1440, 2160'
          );
        }
      }
    } else if (params.width !== undefined || params.height !== undefined) {
      throw new Error(
        'For explorer mode, set resolution using explorerSettings.camera.width and explorerSettings.camera.height instead of top-level width/height'
      );
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
    const { WORKSPACE_ROOT } = await import('../../core/config.js');
    const response = await this.unityConnection.sendCommand('capture_screenshot', { ...(params||{}), workspaceRoot: WORKSPACE_ROOT });

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
      // Basic capture examples
      quickGameCapture: {
        description: 'Quick capture of current game view for debugging',
        params: {
          captureMode: 'game'
        }
      },
      captureForAnalysis: {
        description: 'Capture game view as base64 for immediate AI analysis',
        params: {
          captureMode: 'game',
          encodeAsBase64: true,
          includeUI: false
        }
      },
      highResSceneCapture: {
        description: 'High-resolution scene view capture for documentation',
        params: {
          captureMode: 'scene',
          width: 3840,
          height: 2160,
          outputPath: 'Assets/Screenshots/scene_4k.png'
        }
      },
      
      // Explorer mode examples for AI/LLM usage
      analyzePlayer: {
        description: 'AI/LLM: Analyze the player character and its surroundings',
        params: {
          captureMode: 'explorer',
          encodeAsBase64: true,
          explorerSettings: {
            target: {
              type: 'gameObject',
              name: 'Player',
              includeChildren: true
            },
            camera: {
              autoFrame: true,
              padding: 0.3,
              fieldOfView: 45
            },
            display: {
              backgroundColor: { r: 0.15, g: 0.15, b: 0.2, a: 1 },
              highlightTarget: true
            }
          }
        }
      },
      inspectUILayout: {
        description: 'AI/LLM: Inspect UI canvas layout and elements',
        params: {
          captureMode: 'explorer',
          encodeAsBase64: true,
          explorerSettings: {
            target: {
              type: 'gameObject',
              name: 'Canvas',
              includeChildren: true
            },
            camera: {
              autoFrame: true,
              padding: 0.1
            },
            display: {
              layers: ['UI'],
              backgroundColor: { r: 0.1, g: 0.1, b: 0.1, a: 1 }
            }
          }
        }
      },
      findAllEnemies: {
        description: 'AI/LLM: Locate and analyze all enemies in the scene',
        params: {
          captureMode: 'explorer',
          encodeAsBase64: true,
          explorerSettings: {
            target: {
              type: 'tag',
              tag: 'Enemy'
            },
            camera: {
              autoFrame: true,
              padding: 0.4,
              fieldOfView: 60
            },
            display: {
              highlightTarget: true,
              showBounds: true
            }
          }
        }
      },
      inspectGameArea: {
        description: 'AI/LLM: Overview of a specific game area or zone',
        params: {
          captureMode: 'explorer',
          encodeAsBase64: true,
          explorerSettings: {
            target: {
              type: 'area',
              center: { x: 0, y: 0, z: 0 },
              radius: 30
            },
            camera: {
              position: { x: 20, y: 30, z: -20 },
              lookAt: { x: 0, y: 0, z: 0 },
              fieldOfView: 50
            },
            display: {
              layers: ['Default', 'Terrain', 'Buildings'],
              showColliders: false
            }
          }
        }
      },
      debugPhysics: {
        description: 'AI/LLM: Debug physics setup with colliders visible',
        params: {
          captureMode: 'explorer',
          encodeAsBase64: true,
          explorerSettings: {
            target: {
              type: 'gameObject',
              name: 'PhysicsTestObject',
              includeChildren: true
            },
            camera: {
              autoFrame: true,
              padding: 0.5
            },
            display: {
              showColliders: true,
              showBounds: true,
              backgroundColor: { r: 0.05, g: 0.05, b: 0.1, a: 1 }
            }
          }
        }
      },
      birdEyeView: {
        description: 'AI/LLM: Top-down bird\'s eye view of the entire level',
        params: {
          captureMode: 'explorer',
          encodeAsBase64: true,
          explorerSettings: {
            camera: {
              position: { x: 0, y: 100, z: 0 },
              rotation: { x: 90, y: 0, z: 0 },
              fieldOfView: 60,
              farClip: 200
            },
            display: {
              backgroundColor: { r: 0.53, g: 0.81, b: 0.92, a: 1 }
            }
          }
        }
      },
      
      // Window capture examples
      captureConsole: {
        description: 'Capture Unity console for error debugging',
        params: {
          captureMode: 'window',
          windowName: 'Console',
          outputPath: 'Assets/Screenshots/console_errors.png'
        }
      },
      captureInspector: {
        description: 'Capture inspector window to document component settings',
        params: {
          captureMode: 'window',
          windowName: 'Inspector'
        }
      },
      
      // Advanced explorer examples
      cinematicShot: {
        description: 'AI/LLM: Cinematic angle shot of a specific scene moment',
        params: {
          captureMode: 'explorer',
          explorerSettings: {
            target: {
              type: 'gameObject',
              name: 'MainCharacter'
            },
            camera: {
              autoFrame: false,
              position: { x: 5, y: 2, z: -8 },
              lookAt: { x: 0, y: 1.5, z: 0 },
              fieldOfView: 35,
              width: 2560,
              height: 1440
            },
            display: {
              backgroundColor: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
              showGizmos: false
            }
          },
          outputPath: 'Assets/Screenshots/cinematic_shot.png'
        }
      },
      multiObjectAnalysis: {
        description: 'AI/LLM: Analyze multiple tagged objects in one view',
        params: {
          captureMode: 'explorer',
          encodeAsBase64: true,
          explorerSettings: {
            target: {
              type: 'tag',
              tag: 'Interactive'
            },
            camera: {
              autoFrame: true,
              padding: 0.5,
              fieldOfView: 70
            },
            display: {
              highlightTarget: true,
              showBounds: true,
              layers: ['Default', 'Interactive']
            }
          }
        }
      }
    };
  }
}
