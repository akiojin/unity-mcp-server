import { BaseToolHandler } from '../base/BaseToolHandler.js';
import path from 'path';

/**
 * Handler for analyzing screenshots from Unity Editor
 */
export class ScreenshotAnalyzeToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'screenshot_analyze',
      'Analyze a screenshot: dimensions/colors, UI elements, and scene content (basic/ui/content/full). For LLMs, prefer basic/ui; use full only when necessary. Provide either imagePath (preferred) or base64 (not both).',
      {
        type: 'object',
        properties: {
          imagePath: {
            type: 'string',
            description: 'Path to the screenshot file to analyze (must be within Assets folder)'
          },
          base64Data: {
            type: 'string',
            description: 'Base64 encoded image data (alternative to imagePath)'
          },
          analysisType: {
            type: 'string',
            enum: ['basic', 'ui', 'content', 'full'],
            
            description: 'Type of analysis: basic (colors, dimensions), ui (UI element detection), content (scene content), full (all)'
          },
          prompt: {
            type: 'string',
            description: 'Optional prompt for AI-based analysis (e.g., "Find all buttons in the UI")'
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
    const { imagePath, base64Data, analysisType = 'basic' } = params;

    // Must provide either imagePath or base64Data
    if (!imagePath && !base64Data) {
      throw new Error('Either imagePath or base64Data must be provided');
    }

    // Cannot provide both
    if (imagePath && base64Data) {
      throw new Error('Provide either imagePath or base64Data, not both');
    }

    // Validate image path if provided
    if (imagePath) {
      if (!imagePath.startsWith('Assets/')) {
        throw new Error('imagePath must be within the Assets folder');
      }
      
      const ext = path.extname(imagePath).toLowerCase();
      if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
        throw new Error('imagePath must be a PNG or JPEG file');
      }
    }

    // Validate analysis type
    if (!['basic', 'ui', 'content', 'full'].includes(analysisType)) {
      throw new Error('analysisType must be one of: basic, ui, content, full');
    }
  }

  /**
   * Executes the screenshot analysis
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The analysis result
   */
  async execute(params) {
    const { imagePath, base64Data, analysisType = 'basic', prompt } = params;

    // If we have base64 data, we can do some analysis locally
    if (base64Data) {
      return this.analyzeBase64Image(base64Data, analysisType, prompt);
    }

    // Otherwise, send to Unity for analysis
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const response = await this.unityConnection.sendCommand('analyze_screenshot', {
      imagePath,
      analysisType
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // Build comprehensive result
    const result = {
      imagePath: response.imagePath,
      width: response.width,
      height: response.height,
      format: response.format,
      fileSize: response.fileSize,
      analysisType: response.analysisType,
      message: response.message || 'Screenshot analyzed successfully'
    };

    // Add analysis results based on type
    if (response.dominantColors) {
      result.dominantColors = response.dominantColors;
    }

    if (response.uiElements) {
      result.uiElements = response.uiElements;
    }

    // If prompt was provided, add AI analysis placeholder
    if (prompt) {
      result.aiAnalysis = {
        prompt: prompt,
        note: 'AI analysis requires integration with vision model. This is a placeholder for future implementation.'
      };
    }

    return result;
  }

  /**
   * Analyzes a base64 encoded image
   * @param {string} base64Data - The base64 encoded image
   * @param {string} analysisType - The type of analysis to perform
   * @param {string} prompt - Optional AI prompt
   * @returns {Object} Analysis results
   */
  analyzeBase64Image(base64Data, analysisType, prompt) {
    // Decode base64 to get image size
    const buffer = Buffer.from(base64Data, 'base64');
    const fileSize = buffer.length;

    // Basic analysis result
    const result = {
      source: 'base64',
      fileSize: fileSize,
      analysisType: analysisType,
      message: 'Base64 image analysis completed'
    };

    // Add placeholder for different analysis types
    switch (analysisType) {
      case 'basic':
        result.analysis = {
          note: 'Basic analysis of base64 images requires image processing library integration',
          fileSize: fileSize,
          estimatedFormat: fileSize > 100000 ? 'Likely PNG or high-quality JPEG' : 'Likely compressed JPEG'
        };
        break;
        
      case 'ui':
        result.uiAnalysis = {
          note: 'UI element detection requires computer vision integration',
          placeholder: 'This would detect buttons, text fields, panels, etc.'
        };
        break;
        
      case 'content':
        result.contentAnalysis = {
          note: 'Content analysis requires scene understanding models',
          placeholder: 'This would identify GameObjects, lighting, materials, etc.'
        };
        break;
        
      case 'full':
        result.fullAnalysis = {
          basic: { note: 'Requires image processing library' },
          ui: { note: 'Requires computer vision' },
          content: { note: 'Requires scene understanding' }
        };
        break;
    }

    // Add AI analysis placeholder if prompt provided
    if (prompt) {
      result.aiAnalysis = {
        prompt: prompt,
        note: 'To enable AI analysis, integrate with a vision model API (e.g., GPT-4V, Claude 3 Vision)',
        suggestion: 'You can use the base64Data with a vision API to analyze: ' + prompt
      };
    }

    return result;
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      analyzeScreenshot: {
        description: 'Analyze a screenshot file',
        params: {
          imagePath: 'Assets/Screenshots/game_view.png',
          analysisType: 'basic'
        }
      },
      analyzeUIElements: {
        description: 'Detect UI elements in screenshot',
        params: {
          imagePath: 'Assets/Screenshots/ui_capture.png',
          analysisType: 'ui'
        }
      },
      analyzeWithPrompt: {
        description: 'AI-guided analysis with prompt',
        params: {
          imagePath: 'Assets/Screenshots/scene.png',
          analysisType: 'full',
          prompt: 'Identify all interactive elements and describe the scene lighting'
        }
      },
      analyzeBase64: {
        description: 'Analyze base64 encoded image',
        params: {
          base64Data: 'iVBORw0KGgoAAAANS...',
          analysisType: 'basic'
        }
      }
    };
  }
}
