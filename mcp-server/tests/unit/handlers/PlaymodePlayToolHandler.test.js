import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PlaymodePlayToolHandler } from '../../../src/handlers/playmode/PlaymodePlayToolHandler.js';
import { createMockUnityConnection } from '../../utils/test-helpers.js';

describe('PlaymodePlayToolHandler', () => {
  let handler;
  let mockConnection;

  const buildConnection = ({
    message = 'Entered play mode',
    pollsUntilPlaying = 1,
    responseFactory
  } = {}) => {
    let polls = 0;
    const sendCommand = mock.fn(async type => {
      if (type === 'play_game') {
        return { status: 'success', message };
      }
      if (type === 'get_editor_state') {
        polls++;
        const isPlaying = polls >= pollsUntilPlaying;
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
    mockConnection = buildConnection({ pollsUntilPlaying: 1 });
    handler = new PlaymodePlayToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'playmode_play');
      assert.equal(handler.description, 'Enter Play Mode.');
      assert.equal(handler.inputSchema.required, undefined);
    });
  });

  describe('validate', () => {
    it('should pass with empty parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });
  });

  describe('execute', () => {
    it('should start play mode successfully', async () => {
      const result = await handler.execute({ pollIntervalMs: 0, maxWaitMs: 50 });

      assert.equal(result.message, 'Entered play mode');
      assert.equal(result.state.isPlaying, true);
      assert.ok(
        mockConnection.sendCommand.mock.calls.some(call => call.arguments[0] === 'get_editor_state')
      );
    });

    it('should parse new response envelope format', async () => {
      const responseFactory = isPlaying => ({
        id: 'cmd-123',
        status: 'success',
        result: {
          status: 'success',
          state: { isPlaying }
        },
        editorState: { isPlaying, isPaused: false }
      });

      mockConnection = buildConnection({ responseFactory, pollsUntilPlaying: 2 });
      handler = new PlaymodePlayToolHandler(mockConnection);

      const result = await handler.execute({ pollIntervalMs: 0 });

      assert.equal(result.state.isPlaying, true);
    });

    it('should handle already playing state', async () => {
      mockConnection = buildConnection({ message: 'Already in play mode', pollsUntilPlaying: 0 });
      handler = new PlaymodePlayToolHandler(mockConnection);

      const result = await handler.execute({ pollIntervalMs: 0 });

      assert.equal(result.message, 'Already in play mode');
      assert.equal(result.state.isPlaying, true);
    });

    it('should throw error if connect fails', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      mockConnection.connect.mock.mockImplementation(async () => {
        throw new Error('Connection unavailable');
      });

      await assert.rejects(async () => handler.execute({}), /Connection unavailable/);
    });

    it('should handle Unity errors', async () => {
      mockConnection = createMockUnityConnection({
        sendCommand: mock.fn(async type => {
          if (type === 'play_game') {
            return { status: 'error', error: 'Cannot enter play mode: Compilation errors exist' };
          }
          throw new Error('unexpected');
        })
      });
      handler = new PlaymodePlayToolHandler(mockConnection);

      await assert.rejects(
        async () => handler.execute({}),
        /Cannot enter play mode: Compilation errors exist/
      );
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({ pollIntervalMs: 0 });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.message, 'Entered play mode');
    });

    it('should return error for Unity errors', async () => {
      mockConnection = createMockUnityConnection({
        sendCommand: mock.fn(async type => {
          if (type === 'play_game') {
            return { status: 'error', error: 'Compilation errors prevent play mode' };
          }
          throw new Error('unexpected');
        })
      });
      handler = new PlaymodePlayToolHandler(mockConnection);

      const result = await handler.handle({});

      assert.equal(result.status, 'error');
      assert.match(result.error, /Compilation errors prevent play mode/);
    });
  });
});
