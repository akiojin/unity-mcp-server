import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PauseToolHandler } from '../../../src/handlers/playmode/PauseToolHandler.js';
import { createMockUnityConnection } from '../../../src/handlers/test-utils/test-helpers.js';

describe('PauseToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        status: 'success',
        message: 'Game paused',
        state: {
          isPlaying: true,
          isPaused: true,
          isCompiling: false,
          timeSinceStartup: 10.5
        }
      }
    });
    handler = new PauseToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'pause_game');
      assert.equal(handler.description, 'Pause or resume Unity play mode');
      assert.deepEqual(handler.inputSchema.required, []);
    });
  });

  describe('validate', () => {
    it('should pass with empty parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });
  });

  describe('execute', () => {
    it('should pause the game successfully', async () => {
      const result = await handler.execute({});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.deepEqual(mockConnection.sendCommand.mock.calls[0].arguments, ['pause_game', {}]);
      
      assert.ok(result);
      assert.equal(result.message, 'Game paused');
      assert.equal(result.state.isPaused, true);
      assert.equal(result.state.isPlaying, true);
    });

    it('should resume the game successfully', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          status: 'success',
          message: 'Game resumed',
          state: {
            isPlaying: true,
            isPaused: false,
            isCompiling: false,
            timeSinceStartup: 15.2
          }
        }
      });
      handler = new PauseToolHandler(mockConnection);
      
      const result = await handler.execute({});
      
      assert.equal(result.message, 'Game resumed');
      assert.equal(result.state.isPaused, false);
      assert.equal(result.state.isPlaying, true);
    });

    it('should handle not in play mode error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          status: 'error',
          error: 'Cannot pause/resume: Not in play mode'
        }
      });
      handler = new PauseToolHandler(mockConnection);
      
      await assert.rejects(
        async () => await handler.execute({}),
        /Cannot pause\/resume: Not in play mode/
      );
    });

    it('should throw error if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      
      await assert.rejects(
        async () => await handler.execute({}),
        /Unity connection not available/
      );
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid pause request through handle method', async () => {
      const result = await handler.handle({});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.message, 'Game paused');
    });

    it('should return error when not in play mode', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          status: 'error',
          error: 'Not in play mode'
        }
      });
      handler = new PauseToolHandler(mockConnection);
      
      const result = await handler.handle({});
      
      assert.equal(result.status, 'error');
      assert.match(result.error, /Not in play mode/);
    });
  });
});