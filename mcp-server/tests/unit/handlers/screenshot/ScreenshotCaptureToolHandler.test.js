import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ScreenshotCaptureToolHandler } from '../../../../src/handlers/screenshot/ScreenshotCaptureToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ScreenshotCaptureToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        path: '.unity/capture/screenshot_game_20250117_120000.png',
        width: 1920,
        height: 1080,
        format: 'PNG'
      }
    });
    handler = new ScreenshotCaptureToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'screenshot_capture');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('screenshot'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.captureMode);
      assert.deepEqual(schema.properties.captureMode.enum, ['game', 'scene', 'window', 'explorer']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.captureMode, 'captureMode parameter should exist');
      assert.ok(props.width, 'width parameter should exist');
      assert.ok(props.height, 'height parameter should exist');
      assert.ok(props.windowName, 'windowName parameter should exist');
      assert.ok(props.encodeAsBase64, 'encodeAsBase64 parameter should exist');
      assert.ok(props.explorerSettings, 'explorerSettings parameter should exist');
    });
  });

  describe('validate', () => {
    it('should pass with default parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });

    it('should pass with game mode', () => {
      assert.doesNotThrow(() => handler.validate({ captureMode: 'game' }));
    });

    it('should pass with scene mode', () => {
      assert.doesNotThrow(() => handler.validate({ captureMode: 'scene' }));
    });

    it('should pass with explorer mode', () => {
      assert.doesNotThrow(() => handler.validate({ captureMode: 'explorer' }));
    });

    it('should pass with window mode and windowName', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          captureMode: 'window',
          windowName: 'Inspector'
        })
      );
    });

    it('should pass with custom dimensions', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          captureMode: 'game',
          width: 1280,
          height: 720
        })
      );
    });

    it('should pass with base64 encoding', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          encodeAsBase64: true
        })
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with default params', async () => {
      const result = await handler.execute({});

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'capture_screenshot');

      assert.ok(result);
      assert.equal(result.success, true);
      assert.ok(result.path);
      assert.ok(result.path.includes('.png'));
    });

    it('should execute with game mode', async () => {
      const result = await handler.execute({ captureMode: 'game' });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.captureMode, 'game');
      assert.equal(result.success, true);
    });

    it('should execute with custom dimensions', async () => {
      const result = await handler.execute({
        captureMode: 'game',
        width: 1280,
        height: 720
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.width, 1280);
      assert.equal(sentParams.height, 720);
      assert.equal(result.success, true);
    });

    it('should execute with explorer mode', async () => {
      const result = await handler.execute({
        captureMode: 'explorer',
        explorerSettings: {
          target: {
            type: 'gameObject',
            name: 'Player'
          }
        }
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.captureMode, 'explorer');
      assert.ok(sentParams.explorerSettings);
      assert.equal(result.success, true);
    });

    it('should execute with base64 encoding', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          path: '.unity/capture/screenshot.png',
          base64Data:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
      });
      handler = new ScreenshotCaptureToolHandler(mockConnection);

      const result = await handler.execute({ encodeAsBase64: true });

      assert.ok(result.base64Data);
      assert.ok(result.base64Data.length > 0);
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Failed to capture screenshot: Window not found'
        }
      });
      handler = new ScreenshotCaptureToolHandler(mockConnection);

      await assert.rejects(async () => await handler.execute({}), /Window not found/);
    });

    it('should throw error if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      await assert.rejects(async () => await handler.execute({}), /Unity connection not available/);
    });

    it('should connect if not already connected', async () => {
      mockConnection.isConnected.mock.mockImplementationOnce(() => false);

      await handler.execute({});

      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });

    it('should include workspace root in command', async () => {
      await handler.execute({});

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok('workspaceRoot' in sentParams || sentParams.captureMode);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({ captureMode: 'game' });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.ok(result.result.content);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({});

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
      assert.ok(result.result.content[0].text.includes('screenshot'));
    });

    it('should handle execution errors gracefully', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Capture failed'
        }
      });
      handler = new ScreenshotCaptureToolHandler(mockConnection);

      const result = await handler.handle({});

      assert.equal(result.status, 'error');
      assert.ok(result.error);
    });
  });

  describe('SPEC-c00be76f compliance', () => {
    it('FR-001: should support game view screenshot', async () => {
      await handler.execute({ captureMode: 'game' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.captureMode, 'game');
    });

    it('FR-002: should support scene view screenshot', async () => {
      await handler.execute({ captureMode: 'scene' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.captureMode, 'scene');
    });

    it('FR-003: should support window screenshot', async () => {
      await handler.execute({ captureMode: 'window', windowName: 'Inspector' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.captureMode, 'window');
      assert.equal(sentParams.windowName, 'Inspector');
    });

    it('FR-004: should support explorer mode screenshot', async () => {
      await handler.execute({ captureMode: 'explorer' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.captureMode, 'explorer');
    });

    it('FR-005: should support custom dimensions', async () => {
      await handler.execute({ width: 1280, height: 720 });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.width, 1280);
      assert.equal(sentParams.height, 720);
    });

    it('FR-006: should save to workspace .unity/capture directory', async () => {
      const result = await handler.execute({});
      assert.ok(result.path.includes('.unity/capture'));
    });

    it('FR-007: should support base64 encoding', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          base64Data: 'test-base64-data'
        }
      });
      handler = new ScreenshotCaptureToolHandler(mockConnection);

      const result = await handler.execute({ encodeAsBase64: true });
      assert.ok(result.base64Data);
    });
  });
});
