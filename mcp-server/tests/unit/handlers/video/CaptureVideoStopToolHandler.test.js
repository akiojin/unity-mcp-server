import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CaptureVideoStopToolHandler } from '../../../../src/handlers/video/CaptureVideoStopToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('CaptureVideoStopToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        recordingId: 'rec-12345',
        status: 'stopped',
        outputPath: '.unity/capture/recording_game_20250117_120000.mp4',
        duration: 15.5,
        fileSize: 5242880
      }
    });
    handler = new CaptureVideoStopToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'capture_video_stop');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('Stop'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.recordingId);
    });
  });

  describe('validate', () => {
    it('should pass with no parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });

    it('should pass with recording ID', () => {
      assert.doesNotThrow(() => handler.validate({
        recordingId: 'rec-12345'
      }));
    });
  });

  describe('execute', () => {
    it('should execute successfully with default params', async () => {
      const result = await handler.execute({});

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'capture_video_stop');

      assert.ok(result);
      assert.equal(result.success, true);
      assert.equal(result.status, 'stopped');
    });

    it('should execute with specific recording ID', async () => {
      const result = await handler.execute({ recordingId: 'rec-12345' });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.recordingId, 'rec-12345');
      assert.equal(result.success, true);
    });

    it('should return recording details', async () => {
      const result = await handler.execute({});

      assert.ok(result.outputPath);
      assert.ok(result.duration);
      assert.equal(typeof result.duration, 'number');
    });

    it('should return file size if available', async () => {
      const result = await handler.execute({});

      assert.ok(result.fileSize);
      assert.equal(typeof result.fileSize, 'number');
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'No active recording to stop'
        }
      });
      handler = new CaptureVideoStopToolHandler(mockConnection);

      await assert.rejects(
        async () => await handler.execute({}),
        /No active recording/
      );
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
      assert.ok(result.result.content[0].text.includes('stopped') ||
                result.result.content[0].text.includes('Recording'));
    });
  });
});
