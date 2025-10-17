import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GetEditorStateToolHandler } from '../../../src/handlers/playmode/GetEditorStateToolHandler.js';
import { createMockUnityConnection } from '../../utils/test-helpers.js';

describe('GetEditorStateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        status: 'success',
        state: {
          isPlaying: false,
          isPaused: false,
          isCompiling: false,
          isUpdating: false,
          applicationPath: '/Applications/Unity/Unity.app',
          applicationContentsPath: '/Applications/Unity/Unity.app/Contents',
          timeSinceStartup: 45.5
        }
      }
    });
    handler = new GetEditorStateToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'get_editor_state');
      assert.equal(handler.description, 'Get current Unity editor state including play mode status');
      assert.equal(handler.inputSchema.required, undefined);
    });
  });

  describe('validate', () => {
    it('should pass with empty parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });
  });

  describe('execute', () => {
    it('should get editor state in edit mode', async () => {
      const result = await handler.execute({});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.deepEqual(mockConnection.sendCommand.mock.calls[0].arguments, ['get_editor_state', {}]);
      
      assert.ok(result);
      assert.ok(result.state);
      assert.equal(result.state.isPlaying, false);
      assert.equal(result.state.isPaused, false);
      assert.equal(result.state.isCompiling, false);
      assert.equal(result.state.isUpdating, false);
      assert.ok(result.state.applicationPath);
      assert.ok(result.state.timeSinceStartup);
    });

    it('should get editor state in play mode', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          status: 'success',
          state: {
            isPlaying: true,
            isPaused: false,
            isCompiling: false,
            isUpdating: false,
            applicationPath: '/Applications/Unity/Unity.app',
            applicationContentsPath: '/Applications/Unity/Unity.app/Contents',
            timeSinceStartup: 120.5
          }
        }
      });
      handler = new GetEditorStateToolHandler(mockConnection);
      
      const result = await handler.execute({});
      
      assert.equal(result.state.isPlaying, true);
      assert.equal(result.state.isPaused, false);
    });

    it('should get editor state when paused', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          status: 'success',
          state: {
            isPlaying: true,
            isPaused: true,
            isCompiling: false,
            isUpdating: false,
            applicationPath: '/Applications/Unity/Unity.app',
            applicationContentsPath: '/Applications/Unity/Unity.app/Contents',
            timeSinceStartup: 150.0
          }
        }
      });
      handler = new GetEditorStateToolHandler(mockConnection);
      
      const result = await handler.execute({});
      
      assert.equal(result.state.isPlaying, true);
      assert.equal(result.state.isPaused, true);
    });

    it('should show compiling state', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          status: 'success',
          state: {
            isPlaying: false,
            isPaused: false,
            isCompiling: true,
            isUpdating: false,
            applicationPath: '/Applications/Unity/Unity.app',
            applicationContentsPath: '/Applications/Unity/Unity.app/Contents',
            timeSinceStartup: 200.0
          }
        }
      });
      handler = new GetEditorStateToolHandler(mockConnection);
      
      const result = await handler.execute({});
      
      assert.equal(result.state.isCompiling, true);
      assert.equal(result.state.isPlaying, false);
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
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.ok(result.result.state);
      assert.equal(typeof result.result.state.isPlaying, 'boolean');
    });

    it('should return error for Unity errors', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          status: 'error',
          error: 'Failed to get editor state'
        }
      });
      handler = new GetEditorStateToolHandler(mockConnection);
      
      const result = await handler.handle({});
      
      assert.equal(result.status, 'error');
      assert.match(result.error, /Failed to get editor state/);
    });
  });
});