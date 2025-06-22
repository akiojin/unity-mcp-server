import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteGameObjectToolHandler } from './DeleteGameObjectToolHandler.js';
import { createMockUnityConnection } from './test-helpers.js';

describe('DeleteGameObjectToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        "deleted": ["/TestObject"],
        "deletedCount": 1,
        "notFound": [],
        "notFoundCount": 0
      }
    });
    handler = new DeleteGameObjectToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.ok(handler.name);
      assert.ok(handler.description);
      assert.deepEqual(handler.inputSchema.required, []);
    });
  });

  describe('validate', () => {
    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() => handler.validate({"path":"/TestObject"}));
    });

    it('should fail when neither path nor paths provided', () => {
      assert.throws(
        () => handler.validate({}),
        /Either "path" or "paths" parameter must be provided/
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({"path":"/TestObject"});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(result.deletedCount, 1);
      assert.deepEqual(result.deleted, ["/TestObject"]);
    });

    it('should connect if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      mockConnection.connect = mock.fn(async () => {});
      
      await handler.execute({"path":"/TestObject"});
      
      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({"path":"/TestObject"});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({});
      
      assert.equal(result.status, 'error');
      assert.match(result.error, /Either "path" or "paths" parameter must be provided/);
    });
  });
});