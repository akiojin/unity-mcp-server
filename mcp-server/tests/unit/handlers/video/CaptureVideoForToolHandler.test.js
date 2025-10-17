import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CaptureVideoForToolHandler } from '../../../../src/handlers/video/CaptureVideoForToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('CaptureVideoForToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        recordingId: 'rec-12345',
        status: 'completed',
        outputPath: '.unity/capture/recording_game_20250117_120000.mp4',
        duration: 10.0,
        fileSize: 3145728
      }
    });
    handler = new CaptureVideoForToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'capture_video_for');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('duration'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.durationSec);
      assert.ok(schema.required.includes('durationSec'));
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.durationSec);
      assert.ok(props.captureMode);
      assert.ok(props.width);
      assert.ok(props.height);
      assert.ok(props.fps);
      assert.ok(props.play);
    });
  });

  describe('validate', () => {
    it('should pass with duration parameter', () => {
      assert.doesNotThrow(() => handler.validate({ durationSec: 10 }));
    });

    it('should pass with all parameters', () => {
      assert.doesNotThrow(() => handler.validate({
        durationSec: 10,
        width: 1920,
        height: 1080,
        fps: 60,
        play: true
      }));
    });
  });

  describe('execute', () => {
    it('should execute successfully with duration', async () => {
      const result = await handler.execute({ durationSec: 10 });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'capture_video_for');

      assert.ok(result);
      assert.equal(result.success, true);
      assert.equal(result.status, 'completed');
    });

    it('should execute with custom parameters', async () => {
      const result = await handler.execute({
        durationSec: 10,
        width: 1920,
        height: 1080,
        fps: 60,
        play: true
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.durationSec, 10);
      assert.equal(sentParams.width, 1920);
      assert.equal(sentParams.height, 1080);
      assert.equal(sentParams.fps, 60);
      assert.equal(sentParams.play, true);
      assert.equal(result.success, true);
    });

    it('should return completed status after duration', async () => {
      const result = await handler.execute({ durationSec: 5 });

      assert.equal(result.status, 'completed');
      assert.ok(result.outputPath);
    });

    it('should return recording duration', async () => {
      const result = await handler.execute({ durationSec: 10 });

      assert.ok(result.duration !== undefined);
      assert.equal(typeof result.duration, 'number');
    });

    it('should return file size', async () => {
      const result = await handler.execute({ durationSec: 10 });

      assert.ok(result.fileSize !== undefined);
      assert.equal(typeof result.fileSize, 'number');
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Failed to record: Unity Recorder not installed'
        }
      });
      handler = new CaptureVideoForToolHandler(mockConnection);

      await assert.rejects(
        async () => await handler.execute({ durationSec: 10 }),
        /Unity Recorder not installed/
      );
    });

    it('should throw error if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      await assert.rejects(
        async () => await handler.execute({ durationSec: 10 }),
        /Unity connection not available/
      );
    });

    it('should connect if not already connected', async () => {
      mockConnection.isConnected.mock.mockImplementationOnce(() => false);

      await handler.execute({ durationSec: 10 });

      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({ durationSec: 10 });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.ok(result.result.content);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({ durationSec: 10 });

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
      assert.ok(result.result.content[0].text.includes('completed') ||
                result.result.content[0].text.includes('Recording'));
    });

    it('should handle execution errors gracefully', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Recording failed'
        }
      });
      handler = new CaptureVideoForToolHandler(mockConnection);

      const result = await handler.handle({ durationSec: 10 });

      assert.equal(result.status, 'error');
      assert.ok(result.error);
    });
  });

  describe('SPEC-c00be76f compliance', () => {
    it('FR-013: should support fixed duration recording', async () => {
      const result = await handler.execute({ durationSec: 10 });
      assert.equal(result.success, true);
      assert.equal(result.status, 'completed');
    });

    it('FR-014: should auto-stop after specified duration', async () => {
      await handler.execute({ durationSec: 5 });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.durationSec, 5);
    });

    it('FR-015: should support entering play mode before recording', async () => {
      await handler.execute({ durationSec: 10, play: true });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.play, true);
    });
  });
});
