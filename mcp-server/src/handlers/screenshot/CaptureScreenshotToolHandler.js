import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for capturing screenshots from Unity Editor
 */
export class CaptureScreenshotToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'capture_screenshot',
      'Capture screenshots from Unity Editor (Game View, Scene View, or specific windows)',
      {
        type: 'object',
        properties: {
          outputPath: {
            type: 'string',
            description: 'Path to save the screenshot (e.g., "Assets/Screenshots/capture.png"). If not provided, auto-generates with timestamp'
          },
          captureMode: {
            type: 'string',
            enum: ['game', 'scene', 'window'],
            default: 'game',
            description: 'What to capture: game (Game View), scene (Scene View), or window (specific editor window)'
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
    const { captureMode = 'game', windowName, outputPath } = params;

    // Validate capture mode
    if (!['game', 'scene', 'window'].includes(captureMode)) {
      throw new Error('captureMode must be one of: game, scene, window');
    }

    // Window mode requires windowName
    if (captureMode === 'window' && !windowName) {
      throw new Error('windowName is required when captureMode is "window"');
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

    // Validate dimensions if provided
    if (params.width !== undefined && (params.width < 0 || params.width > 8192)) {
      throw new Error('width must be between 0 and 8192');
    }
    
    if (params.height !== undefined && (params.height < 0 || params.height > 8192)) {
      throw new Error('height must be between 0 and 8192');
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
        description: 'Capture the Game View',
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
      }
    };
  }
}