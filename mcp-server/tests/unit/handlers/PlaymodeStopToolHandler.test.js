import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PlaymodeStopToolHandler } from '../../../src/handlers/playmode/PlaymodeStopToolHandler.js';
import { createMockUnityConnection } from '../../utils/test-helpers.js';

describe('PlaymodeStopToolHandler', () => {
  let handler;
  let mockConnection;

  const buildConnection = ({
    stopMessage = 'Exited play mode',
    pollsUntilStopped = 1,
    responseFactory
  } = {}) => {
    let polls = 0;
    const sendCommand = mock.fn(async type => {
      if (type === 'stop_game') {
        return { status: 'success', message: stopMessage };
      }
      if (type === 'get_editor_state') {
        polls++;
        const isPlaying = polls <= pollsUntilStopped;
        if (typeof responseFactory === 'function') {
          return responseFactory(isPlaying);
        }
        return {
          status: 'success',
          state: { isPlaying }
        };
      }
      throw new Error(`Unexpected command ${type}`);
    });

    return createMockUnityConnection({ sendCommand });
  };

  beforeEach(() => {
    mockConnection = buildConnection({ pollsUntilStopped: 0 });
    handler = new PlaymodeStopToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'playmode_stop');
      assert.equal(handler.description, 'Exit Play Mode and return to Edit Mode.');
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
      const result = await handler.execute({ pollIntervalMs: 0, maxWaitMs: 50 });

      assert.equal(result.message, 'Exited play mode');
      assert.equal(result.state.isPlaying, false);
      assert.ok(
        mockConnection.sendCommand.mock.calls.some(call => call.arguments[0] === 'get_editor_state')
      );
    });

    it('should parse wrapped editor state responses', async () => {
      const responseFactory = isPlaying => ({
        status: 'success',
        result: {
          status: 'success',
          state: { isPlaying }
        },
        editorState: { isPlaying }
      });

      mockConnection = buildConnection({ responseFactory, pollsUntilStopped: 0 });
      handler = new PlaymodeStopToolHandler(mockConnection);

      const result = await handler.execute({ pollIntervalMs: 0 });

      assert.equal(result.state.isPlaying, false);
    });

    it('should handle already stopped state', async () => {
      mockConnection = buildConnection({ stopMessage: 'Already stopped', pollsUntilStopped: -1 });
      handler = new PlaymodeStopToolHandler(mockConnection);

      const result = await handler.execute({ pollIntervalMs: 0 });

      assert.equal(result.message, 'Already stopped');
      assert.equal(result.state.isPlaying, false);
    });

    it('should throw error if connect fails', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      mockConnection.connect.mock.mockImplementation(async () => {
        throw new Error('Connection refused');
      });

      await assert.rejects(async () => handler.execute({}), /Connection refused/);
    });

    it('should handle Unity errors', async () => {
      mockConnection = createMockUnityConnection({
        sendCommand: mock.fn(async type => {
          if (type === 'stop_game') {
            return { status: 'error', error: 'Error stopping play mode: Internal error' };
          }
          throw new Error('should not reach');
        })
      });
      handler = new PlaymodeStopToolHandler(mockConnection);

      await assert.rejects(
        async () => handler.execute({}),
        /Error stopping play mode: Internal error/
      );
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid stop request through handle method', async () => {
      const result = await handler.handle({ pollIntervalMs: 0 });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.message, 'Exited play mode');
    });

    it('should return error for Unity errors', async () => {
      mockConnection = createMockUnityConnection({
        sendCommand: mock.fn(async type => {
          if (type === 'stop_game') {
            return { status: 'error', error: 'Failed to stop play mode' };
          }
          throw new Error('should not reach');
        })
      });
      handler = new PlaymodeStopToolHandler(mockConnection);

      const result = await handler.handle({});

      assert.equal(result.status, 'error');
      assert.match(result.error, /Failed to stop play mode/);
    });
  });
});
