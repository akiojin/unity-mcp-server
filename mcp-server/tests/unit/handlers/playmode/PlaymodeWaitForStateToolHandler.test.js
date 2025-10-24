import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PlaymodeWaitForStateToolHandler } from '../../../../src/handlers/playmode/PlaymodeWaitForStateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('PlaymodeWaitForStateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        isPlaying: true,
        isPaused: false,
        platform: 'EditMode',
        unityVersion: '2022.3.0f1'
      }
    });
    handler = new PlaymodeWaitForStateToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'playmode_wait_for_state');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('wait'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.isPlaying);
      assert.ok(schema.properties.timeoutMs);
      assert.ok(schema.properties.pollMs);
      assert.deepEqual(schema.required, ['isPlaying']);
    });
  });

  describe('validate', () => {
    it('should pass with isPlaying parameter', () => {
      assert.doesNotThrow(() => handler.validate({ isPlaying: true }));
    });

    it('should pass with timeout parameter', () => {
      assert.doesNotThrow(() => handler.validate({
        isPlaying: true,
        timeoutMs: 5000
      }));
    });

    it('should pass with poll interval parameter', () => {
      assert.doesNotThrow(() => handler.validate({
        isPlaying: true,
        pollMs: 100
      }));
    });
  });

  describe('execute', () => {
    it('should execute successfully when state matches immediately', async () => {
      const result = await handler.execute({ isPlaying: true });

      assert.ok(result);
      assert.equal(result.status, 'success');
      assert.ok(result.state);
      assert.equal(result.state.isPlaying, true);
    });

    it('should return waited time', async () => {
      const result = await handler.execute({ isPlaying: true });

      assert.ok(result.waitedMs !== undefined);
      assert.equal(typeof result.waitedMs, 'number');
      assert.ok(result.waitedMs >= 0);
    });

    it('should wait for play mode state', async () => {
      const result = await handler.execute({ isPlaying: true });

      assert.equal(result.status, 'success');
      assert.equal(result.state.isPlaying, true);
    });

    it('should wait for edit mode state', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          isPlaying: false,
          isPaused: false
        }
      });
      handler = new PlaymodeWaitForStateToolHandler(mockConnection);

      const result = await handler.execute({ isPlaying: false });

      assert.equal(result.status, 'success');
      assert.equal(result.state.isPlaying, false);
    });

    it('should timeout when state not reached', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          isPlaying: false,
          isPaused: false
        }
      });
      handler = new PlaymodeWaitForStateToolHandler(mockConnection);

      const result = await handler.execute({
        isPlaying: true,
        timeoutMs: 100,
        pollMs: 50
      });

      assert.equal(result.status, 'timeout');
      assert.ok(result.waitedMs >= 100);
    });

    it('should use custom poll interval', async () => {
      const startTime = Date.now();
      const result = await handler.execute({
        isPlaying: true,
        pollMs: 10
      });

      assert.equal(result.status, 'success');
      // Should complete quickly with small poll interval
      assert.ok(Date.now() - startTime < 1000);
    });

    it('should connect if not already connected', async () => {
      mockConnection.isConnected.mock.mockImplementationOnce(() => false);

      await handler.execute({ isPlaying: true });

      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });

    it('should poll get_editor_state command', async () => {
      await handler.execute({ isPlaying: true });

      const calls = mockConnection.sendCommand.mock.calls;
      assert.ok(calls.length >= 1);
      assert.equal(calls[0].arguments[0], 'get_editor_state');
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({ isPlaying: true });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({ isPlaying: true });

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
    });

    it('should handle timeout gracefully', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          isPlaying: false
        }
      });
      handler = new PlaymodeWaitForStateToolHandler(mockConnection);

      const result = await handler.handle({
        isPlaying: true,
        timeoutMs: 100
      });

      // Timeout is not an error, just a status
      assert.ok(result.result);
    });
  });

  describe('SPEC-5c438276 compliance', () => {
    it('FR-004: should wait for play mode state', async () => {
      const result = await handler.execute({ isPlaying: true });
      assert.equal(result.status, 'success');
      assert.equal(result.state.isPlaying, true);
    });

    it('FR-005: should wait for edit mode state', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: { isPlaying: false }
      });
      handler = new PlaymodeWaitForStateToolHandler(mockConnection);

      const result = await handler.execute({ isPlaying: false });
      assert.equal(result.status, 'success');
      assert.equal(result.state.isPlaying, false);
    });

    it('FR-006: should support timeout configuration', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: { isPlaying: false }
      });
      handler = new PlaymodeWaitForStateToolHandler(mockConnection);

      const result = await handler.execute({
        isPlaying: true,
        timeoutMs: 100
      });
      assert.equal(result.status, 'timeout');
    });

    it('FR-007: should support poll interval configuration', async () => {
      const result = await handler.execute({
        isPlaying: true,
        pollMs: 50
      });
      assert.equal(result.status, 'success');
    });
  });
});
