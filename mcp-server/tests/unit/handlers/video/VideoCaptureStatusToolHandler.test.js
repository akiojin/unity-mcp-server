import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { VideoCaptureStatusToolHandler } from '../../../../src/handlers/video/VideoCaptureStatusToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('VideoCaptureStatusToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        isRecording: true,
        recordingId: 'rec-12345',
        status: 'recording',
        currentDuration: 10.5,
        outputPath: '.unity/captures/video_game_20250117_120000.mp4'
      }
    });
    handler = new VideoCaptureStatusToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'capture_video_status');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('status'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
    });
  });

  describe('validate', () => {
    it('should pass with no parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });
  });

  describe('execute', () => {
    it('should execute successfully with default params', async () => {
      const result = await handler.execute({});

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'capture_video_status');

      assert.ok(result);
      assert.equal(result.success, true);
    });

    it('should return recording status', async () => {
      const result = await handler.execute({});

      assert.equal(result.isRecording, true);
      assert.equal(result.status, 'recording');
    });

    it('should return current duration when recording', async () => {
      const result = await handler.execute({});

      assert.ok(result.currentDuration !== undefined);
      assert.equal(typeof result.currentDuration, 'number');
    });

    it('should handle not recording status', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          isRecording: false,
          status: 'idle'
        }
      });
      handler = new VideoCaptureStatusToolHandler(mockConnection);

      const result = await handler.execute({});

      assert.equal(result.isRecording, false);
      assert.equal(result.status, 'idle');
    });

    it('should return recording ID when active', async () => {
      const result = await handler.execute({});

      assert.ok(result.recordingId);
      assert.equal(typeof result.recordingId, 'string');
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({});

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({});

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
    });
  });
});
