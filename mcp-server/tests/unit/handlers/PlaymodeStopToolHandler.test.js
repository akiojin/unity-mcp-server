import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PlaymodeStopToolHandler } from '../../../src/handlers/playmode/PlaymodeStopToolHandler.js';
import { createMockUnityConnection } from '../../utils/test-helpers.js';

describe('PlaymodeStopToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        status: 'success',
        message: 'Exited play mode',
        state: {
          isPlaying: false,
          isPaused: false,
          isCompiling: false,
          timeSinceStartup: 20.0
        }
      }
    });
    handler = new PlaymodeStopToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'playmode_stop');
      assert.equal(handler.description, 'Stop Unity play mode and return to edit mode');
      assert.equal(handler.inputSchema.required, undefined);
    });
  });

  describe('validate', () => {
    it('should pass with empty parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });
  });

  describe('execute', () => {
    it('should stop play mode successfully', async () => {
      const result = await handler.execute({});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.deepEqual(mockConnection.sendCommand.mock.calls[0].arguments, ['stop_game', {}]);
      
      assert.ok(result);
      assert.equal(result.message, 'Exited play mode');
      assert.equal(result.state.isPlaying, false);
      assert.equal(result.state.isPaused, false);
    });

    it('should handle already stopped state', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          status: 'success',
          message: 'Already stopped (not in play mode)',
          state: {
            isPlaying: false,
            isPaused: false,
            isCompiling: false,
            timeSinceStartup: 25.0
          }
        }
      });
      handler = new PlaymodeStopToolHandler(mockConnection);
      
      const result = await handler.execute({});
      
      assert.equal(result.message, 'Already stopped (not in play mode)');
      assert.equal(result.state.isPlaying, false);
    });

    it('should throw error if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      
      await assert.rejects(
        async () => await handler.execute({}),
        /Unity connection not available/
      );
    });

    it('should handle Unity errors', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          status: 'error',
          error: 'Error stopping play mode: Internal error'
        }
      });
      handler = new PlaymodeStopToolHandler(mockConnection);
      
      await assert.rejects(
        async () => await handler.execute({}),
        /Error stopping play mode: Internal error/
      );
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid stop request through handle method', async () => {
      const result = await handler.handle({});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.message, 'Exited play mode');
    });

    it('should return error for Unity errors', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          status: 'error',
          error: 'Failed to stop play mode'
        }
      });
      handler = new PlaymodeStopToolHandler(mockConnection);
      
      const result = await handler.handle({});
      
      assert.equal(result.status, 'error');
      assert.match(result.error, /Failed to stop play mode/);
    });
  });
});