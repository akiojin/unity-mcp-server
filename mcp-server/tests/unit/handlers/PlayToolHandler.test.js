import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PlayToolHandler } from '../../../src/handlers/playmode/PlayToolHandler.js';
import { createMockUnityConnection } from '../../../src/handlers/test-utils/test-helpers.js';

describe('PlayToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        status: 'success',
        message: 'Entered play mode',
        state: {
          isPlaying: true,
          isPaused: false,
          isCompiling: false,
          timeSinceStartup: 0.0
        }
      }
    });
    handler = new PlayToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'play_game');
      assert.equal(handler.description, 'Start Unity play mode to test the game');
      assert.deepEqual(handler.inputSchema.required, []);
    });
  });

  describe('validate', () => {
    it('should pass with empty parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });
  });

  describe('execute', () => {
    it('should start play mode successfully', async () => {
      const result = await handler.execute({});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.deepEqual(mockConnection.sendCommand.mock.calls[0].arguments, ['play_game', {}]);
      
      assert.ok(result);
      assert.equal(result.message, 'Entered play mode');
      assert.deepEqual(result.state, {
        isPlaying: true,
        isPaused: false,
        isCompiling: false,
        timeSinceStartup: 0.0
      });
    });

    it('should handle already playing state', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          status: 'success',
          message: 'Already in play mode',
          state: {
            isPlaying: true,
            isPaused: false,
            isCompiling: false,
            timeSinceStartup: 5.5
          }
        }
      });
      handler = new PlayToolHandler(mockConnection);
      
      const result = await handler.execute({});
      
      assert.equal(result.message, 'Already in play mode');
      assert.equal(result.state.isPlaying, true);
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
          error: 'Cannot enter play mode: Compilation errors exist'
        }
      });
      handler = new PlayToolHandler(mockConnection);
      
      await assert.rejects(
        async () => await handler.execute({}),
        /Cannot enter play mode: Compilation errors exist/
      );
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.message, 'Entered play mode');
    });

    it('should return error for Unity errors', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          status: 'error',
          error: 'Compilation errors prevent play mode'
        }
      });
      handler = new PlayToolHandler(mockConnection);
      
      const result = await handler.handle({});
      
      assert.equal(result.status, 'error');
      assert.match(result.error, /Compilation errors prevent play mode/);
    });
  });
});