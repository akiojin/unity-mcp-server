import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ClearConsoleToolHandler } from '../../../../src/handlers/console/ClearConsoleToolHandler.js';

describe('ClearConsoleToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async () => ({
        success: true,
        message: 'Console cleared successfully',
        timestamp: '2025-01-24T12:00:00Z'
      }))
    };
    
    handler = new ClearConsoleToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'clear_console');
      assert.equal(handler.description, 'Clear Unity Editor console logs');
      assert.ok(handler.inputSchema);
      assert.equal(typeof handler.execute, 'function');
    });

    it('should define optional input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.clearOnPlay);
      assert.ok(schema.properties.clearOnRecompile);
      assert.ok(schema.properties.clearOnBuild);
      assert.ok(schema.properties.preserveWarnings);
      assert.ok(schema.properties.preserveErrors);
      assert.deepEqual(schema.required, []); // No required parameters
    });

    it('should define boolean properties with defaults', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.properties.clearOnPlay.type, 'boolean');
      assert.equal(schema.properties.clearOnPlay.default, true);
      assert.equal(schema.properties.clearOnRecompile.type, 'boolean');
      assert.equal(schema.properties.clearOnRecompile.default, true);
      assert.equal(schema.properties.clearOnBuild.type, 'boolean');
      assert.equal(schema.properties.clearOnBuild.default, true);
      assert.equal(schema.properties.preserveWarnings.type, 'boolean');
      assert.equal(schema.properties.preserveWarnings.default, false);
      assert.equal(schema.properties.preserveErrors.type, 'boolean');
      assert.equal(schema.properties.preserveErrors.default, false);
    });
  });

  describe('validate', () => {
    it('should pass with no parameters', () => {
      assert.doesNotThrow(() => {
        handler.validate({});
      });
    });

    it('should pass with valid boolean parameters', () => {
      assert.doesNotThrow(() => {
        handler.validate({
          clearOnPlay: true,
          clearOnRecompile: false,
          clearOnBuild: true,
          preserveWarnings: false,
          preserveErrors: true
        });
      });
    });

    it('should fail with non-boolean clearOnPlay', () => {
      assert.throws(
        () => handler.validate({ clearOnPlay: 'yes' }),
        /clearOnPlay must be a boolean/
      );
    });

    it('should fail with non-boolean clearOnRecompile', () => {
      assert.throws(
        () => handler.validate({ clearOnRecompile: 1 }),
        /clearOnRecompile must be a boolean/
      );
    });

    it('should fail with non-boolean clearOnBuild', () => {
      assert.throws(
        () => handler.validate({ clearOnBuild: null }),
        /clearOnBuild must be a boolean/
      );
    });

    it('should fail with non-boolean preserveWarnings', () => {
      assert.throws(
        () => handler.validate({ preserveWarnings: 'true' }),
        /preserveWarnings must be a boolean/
      );
    });

    it('should fail with non-boolean preserveErrors', () => {
      assert.throws(
        () => handler.validate({ preserveErrors: 0 }),
        /preserveErrors must be a boolean/
      );
    });

    it('should fail when trying to preserve without keeping any logs', () => {
      assert.throws(
        () => handler.validate({ 
          preserveWarnings: true,
          preserveErrors: false,
          clearOnPlay: false,
          clearOnRecompile: false,
          clearOnBuild: false
        }),
        /Cannot preserve specific log types when not clearing console/
      );
    });
  });

  describe('execute', () => {
    it('should clear console with default settings', async () => {
      const result = await handler.execute({});

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockUnityConnection.sendCommand.mock.calls[0].arguments[0], 'clear_console');
      
      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.clearOnPlay, true);
      assert.equal(params.clearOnRecompile, true);
      assert.equal(params.clearOnBuild, true);
      assert.equal(params.preserveWarnings, false);
      assert.equal(params.preserveErrors, false);

      assert.equal(result.message, 'Console cleared successfully');
      assert.ok(result.timestamp);
    });

    it('should clear console with custom settings', async () => {
      await handler.execute({
        clearOnPlay: false,
        clearOnRecompile: true,
        clearOnBuild: false,
        preserveWarnings: true,
        preserveErrors: false
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.clearOnPlay, false);
      assert.equal(params.clearOnRecompile, true);
      assert.equal(params.clearOnBuild, false);
      assert.equal(params.preserveWarnings, true);
      assert.equal(params.preserveErrors, false);
    });

    it('should connect if not connected', async () => {
      mockUnityConnection.isConnected.mock.mockImplementation(() => false);

      await handler.execute({});

      assert.equal(mockUnityConnection.connect.mock.calls.length, 1);
    });

    it('should handle Unity connection errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => {
        throw new Error('Unity not responding');
      });

      await assert.rejects(
        () => handler.execute({}),
        /Unity not responding/
      );
    });

    it('should handle console clear failure', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Failed to clear console: Permission denied'
      }));

      await assert.rejects(
        () => handler.execute({}),
        /Failed to clear console/
      );
    });

    it('should include clear statistics if available', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        message: 'Console cleared successfully',
        clearedCount: 150,
        remainingCount: 5,
        preservedWarnings: 3,
        preservedErrors: 2,
        timestamp: '2025-01-24T12:00:00Z'
      }));

      const result = await handler.execute({
        preserveWarnings: true,
        preserveErrors: true
      });

      assert.equal(result.clearedCount, 150);
      assert.equal(result.remainingCount, 5);
      assert.equal(result.preservedWarnings, 3);
      assert.equal(result.preservedErrors, 2);
    });

    it('should handle partial clear when preserving logs', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        message: 'Console partially cleared',
        clearedCount: 100,
        remainingCount: 25,
        preservedWarnings: 10,
        preservedErrors: 15,
        timestamp: '2025-01-24T12:00:00Z'
      }));

      const result = await handler.execute({
        preserveWarnings: true,
        preserveErrors: true
      });

      assert.equal(result.message, 'Console partially cleared');
      assert.equal(result.clearedCount, 100);
      assert.equal(result.remainingCount, 25);
    });

    it('should handle console settings update', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        message: 'Console settings updated',
        settingsUpdated: true,
        clearOnPlay: false,
        clearOnRecompile: true,
        clearOnBuild: false,
        timestamp: '2025-01-24T12:00:00Z'
      }));

      const result = await handler.execute({
        clearOnPlay: false,
        clearOnRecompile: true,
        clearOnBuild: false
      });

      assert.equal(result.settingsUpdated, true);
      assert.equal(result.clearOnPlay, false);
      assert.equal(result.clearOnRecompile, true);
      assert.equal(result.clearOnBuild, false);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({});

      assert.equal(result.status, 'success');
      assert.ok(result.result.message);
      assert.ok(result.result.timestamp);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({
        clearOnPlay: 'invalid'
      });

      assert.equal(result.status, 'error');
      assert.ok(result.error.includes('clearOnPlay must be a boolean'));
    });

    it('should handle with all parameters', async () => {
      const result = await handler.handle({
        clearOnPlay: false,
        clearOnRecompile: false,
        clearOnBuild: true,
        preserveWarnings: true,
        preserveErrors: true
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result.message);
    });
  });
});