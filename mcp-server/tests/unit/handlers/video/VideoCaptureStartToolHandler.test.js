import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { VideoCaptureStartToolHandler } from '../../../../src/handlers/video/VideoCaptureStartToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('VideoCaptureStartToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        recordingId: 'rec-12345',
        status: 'recording',
        outputPath: '.unity/captures/video_game_20250117_120000.mp4'
      }
    });
    handler = new VideoCaptureStartToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'capture_video_start');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('video'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.captureMode);
      assert.deepEqual(schema.properties.captureMode.enum, ['game']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.captureMode);
      assert.ok(props.width);
      assert.ok(props.height);
      assert.ok(props.fps);
      assert.ok(props.maxDurationSec);
    });
  });

  describe('validate', () => {
    it('should pass with default parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });

    it('should pass with custom dimensions', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          width: 1920,
          height: 1080,
          fps: 60
        })
      );
    });

    it('should pass with max duration', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          maxDurationSec: 30
        })
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with default params', async () => {
      const result = await handler.execute({});

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'capture_video_start');

      assert.ok(result);
      assert.equal(result.success, true);
      assert.ok(result.recordingId);
      assert.equal(result.status, 'recording');
    });

    it('should execute with custom parameters', async () => {
      const result = await handler.execute({
        width: 1920,
        height: 1080,
        fps: 60,
        maxDurationSec: 30
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.width, 1920);
      assert.equal(sentParams.height, 1080);
      assert.equal(sentParams.fps, 60);
      assert.equal(sentParams.maxDurationSec, 30);
      assert.equal(result.success, true);
    });

    it('should return recording ID', async () => {
      const result = await handler.execute({});

      assert.ok(result.recordingId);
      assert.equal(typeof result.recordingId, 'string');
    });

    it('should return output path', async () => {
      const result = await handler.execute({});

      assert.ok(result.outputPath);
      assert.ok(result.outputPath.includes('.unity/captures'));
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Failed to start recording: Unity Recorder not installed'
        }
      });
      handler = new VideoCaptureStartToolHandler(mockConnection);

      await assert.rejects(async () => await handler.execute({}), /Unity Recorder not installed/);
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
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({});

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.ok(result.result.content);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({});

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
      assert.ok(result.result.content[0].text.includes('recording'));
    });

    it('should handle execution errors gracefully', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Recording failed'
        }
      });
      handler = new VideoCaptureStartToolHandler(mockConnection);

      const result = await handler.handle({});

      assert.equal(result.status, 'error');
      assert.ok(result.error);
    });
  });

  describe('SPEC-c00be76f compliance', () => {
    it('FR-008: should support video recording', async () => {
      const result = await handler.execute({});
      assert.equal(result.success, true);
      assert.equal(result.status, 'recording');
    });

    it('FR-009: should support custom frame rate', async () => {
      await handler.execute({ fps: 60 });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.fps, 60);
    });

    it('FR-010: should support custom dimensions', async () => {
      await handler.execute({ width: 1920, height: 1080 });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.width, 1920);
      assert.equal(sentParams.height, 1080);
    });

    it('FR-011: should save to workspace .unity/captures directory', async () => {
      const result = await handler.execute({});
      assert.ok(result.outputPath.includes('.unity/captures'));
    });

    it('FR-012: should return recording ID for tracking', async () => {
      const result = await handler.execute({});
      assert.ok(result.recordingId);
    });
  });
});
