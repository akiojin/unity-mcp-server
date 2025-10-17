import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AnalyzeScreenshotToolHandler } from '../../../../src/handlers/screenshot/AnalyzeScreenshotToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AnalyzeScreenshotToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        imagePath: 'Assets/Screenshots/game_view.png',
        width: 1920,
        height: 1080,
        format: 'PNG',
        fileSize: 524288,
        analysisType: 'basic',
        dominantColors: [
          { r: 100, g: 150, b: 200, percentage: 30 },
          { r: 50, g: 75, b: 100, percentage: 25 }
        ]
      }
    });
    handler = new AnalyzeScreenshotToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'analyze_screenshot');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('Analyze'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.imagePath);
      assert.ok(schema.properties.base64Data);
      assert.ok(schema.properties.analysisType);
      assert.ok(schema.properties.prompt);
    });
  });

  describe('validate', () => {
    it('should pass with imagePath', () => {
      assert.doesNotThrow(() => handler.validate({
        imagePath: 'Assets/Screenshots/test.png'
      }));
    });

    it('should pass with base64Data', () => {
      assert.doesNotThrow(() => handler.validate({
        base64Data: 'iVBORw0KGgoAAAANS...'
      }));
    });

    it('should throw error without imagePath or base64Data', () => {
      assert.throws(
        () => handler.validate({}),
        /Either imagePath or base64Data must be provided/
      );
    });

    it('should throw error with both imagePath and base64Data', () => {
      assert.throws(
        () => handler.validate({
          imagePath: 'Assets/test.png',
          base64Data: 'data...'
        }),
        /not both/
      );
    });

    it('should throw error for imagePath outside Assets', () => {
      assert.throws(
        () => handler.validate({
          imagePath: '/absolute/path/test.png'
        }),
        /must be within the Assets folder/
      );
    });

    it('should throw error for unsupported file format', () => {
      assert.throws(
        () => handler.validate({
          imagePath: 'Assets/test.bmp'
        }),
        /must be a PNG or JPEG/
      );
    });

    it('should pass with valid analysisType', () => {
      assert.doesNotThrow(() => handler.validate({
        imagePath: 'Assets/test.png',
        analysisType: 'basic'
      }));
    });
  });

  describe('execute - with imagePath', () => {
    it('should execute successfully with basic analysis', async () => {
      const result = await handler.execute({
        imagePath: 'Assets/Screenshots/game_view.png',
        analysisType: 'basic'
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'analyze_screenshot');

      assert.ok(result);
      assert.equal(result.imagePath, 'Assets/Screenshots/game_view.png');
      assert.equal(result.width, 1920);
      assert.equal(result.height, 1080);
      assert.equal(result.format, 'PNG');
    });

    it('should include dominant colors for basic analysis', async () => {
      const result = await handler.execute({
        imagePath: 'Assets/test.png',
        analysisType: 'basic'
      });

      assert.ok(result.dominantColors);
      assert.ok(Array.isArray(result.dominantColors));
      assert.equal(result.dominantColors.length, 2);
    });

    it('should include UI elements for ui analysis', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          imagePath: 'Assets/test.png',
          width: 1920,
          height: 1080,
          analysisType: 'ui',
          uiElements: [
            { type: 'Button', position: { x: 100, y: 200 } },
            { type: 'TextField', position: { x: 300, y: 400 } }
          ]
        }
      });
      handler = new AnalyzeScreenshotToolHandler(mockConnection);

      const result = await handler.execute({
        imagePath: 'Assets/test.png',
        analysisType: 'ui'
      });

      assert.ok(result.uiElements);
      assert.ok(Array.isArray(result.uiElements));
      assert.equal(result.uiElements.length, 2);
    });

    it('should include AI analysis note with prompt', async () => {
      const result = await handler.execute({
        imagePath: 'Assets/test.png',
        analysisType: 'full',
        prompt: 'Find all buttons'
      });

      assert.ok(result.aiAnalysis);
      assert.equal(result.aiAnalysis.prompt, 'Find all buttons');
      assert.ok(result.aiAnalysis.note);
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'File not found'
        }
      });
      handler = new AnalyzeScreenshotToolHandler(mockConnection);

      await assert.rejects(
        async () => await handler.execute({
          imagePath: 'Assets/invalid.png'
        }),
        /File not found/
      );
    });
  });

  describe('execute - with base64Data', () => {
    it('should analyze base64 image locally', async () => {
      const base64 = Buffer.from('test image data').toString('base64');
      const result = await handler.execute({
        base64Data: base64,
        analysisType: 'basic'
      });

      // Should not call Unity for base64 analysis
      assert.equal(mockConnection.sendCommand.mock.calls.length, 0);

      assert.equal(result.source, 'base64');
      assert.ok(result.fileSize);
      assert.equal(result.analysisType, 'basic');
    });

    it('should include analysis note for basic type', async () => {
      const base64 = Buffer.from('test').toString('base64');
      const result = await handler.execute({
        base64Data: base64,
        analysisType: 'basic'
      });

      assert.ok(result.analysis);
      assert.ok(result.analysis.note);
    });

    it('should include UI analysis placeholder for ui type', async () => {
      const base64 = Buffer.from('test').toString('base64');
      const result = await handler.execute({
        base64Data: base64,
        analysisType: 'ui'
      });

      assert.ok(result.uiAnalysis);
      assert.ok(result.uiAnalysis.note);
    });

    it('should include content analysis placeholder for content type', async () => {
      const base64 = Buffer.from('test').toString('base64');
      const result = await handler.execute({
        base64Data: base64,
        analysisType: 'content'
      });

      assert.ok(result.contentAnalysis);
      assert.ok(result.contentAnalysis.note);
    });

    it('should include full analysis for full type', async () => {
      const base64 = Buffer.from('test').toString('base64');
      const result = await handler.execute({
        base64Data: base64,
        analysisType: 'full'
      });

      assert.ok(result.fullAnalysis);
      assert.ok(result.fullAnalysis.basic);
      assert.ok(result.fullAnalysis.ui);
      assert.ok(result.fullAnalysis.content);
    });

    it('should include AI analysis with prompt', async () => {
      const base64 = Buffer.from('test').toString('base64');
      const result = await handler.execute({
        base64Data: base64,
        analysisType: 'basic',
        prompt: 'Describe the scene'
      });

      assert.ok(result.aiAnalysis);
      assert.equal(result.aiAnalysis.prompt, 'Describe the scene');
      assert.ok(result.aiAnalysis.suggestion);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        imagePath: 'Assets/test.png',
        analysisType: 'basic'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({
        imagePath: 'Assets/test.png'
      });

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
    });

    it('should handle validation errors gracefully', async () => {
      const result = await handler.handle({});

      assert.equal(result.status, 'error');
      assert.ok(result.error);
    });
  });

  describe('getExamples', () => {
    it('should return example usage scenarios', () => {
      const examples = handler.getExamples();

      assert.ok(examples);
      assert.ok(examples.analyzeScreenshot);
      assert.ok(examples.analyzeUIElements);
      assert.ok(examples.analyzeWithPrompt);
      assert.ok(examples.analyzeBase64);
    });
  });

  describe('SPEC-c00be76f compliance', () => {
    it('FR-013: should support screenshot analysis', async () => {
      const result = await handler.execute({
        imagePath: 'Assets/test.png',
        analysisType: 'basic'
      });
      assert.ok(result.width);
      assert.ok(result.height);
    });

    it('FR-014: should support multiple analysis types', async () => {
      for (const type of ['basic', 'ui', 'content', 'full']) {
        assert.doesNotThrow(() => handler.validate({
          imagePath: 'Assets/test.png',
          analysisType: type
        }));
      }
    });

    it('FR-015: should support base64 image analysis', async () => {
      const base64 = Buffer.from('test').toString('base64');
      const result = await handler.execute({
        base64Data: base64,
        analysisType: 'basic'
      });
      assert.equal(result.source, 'base64');
    });
  });
});
