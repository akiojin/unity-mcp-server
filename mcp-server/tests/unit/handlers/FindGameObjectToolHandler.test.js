import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { FindGameObjectToolHandler } from '../../../src/handlers/gameobject/FindGameObjectToolHandler.js';
import { createMockUnityConnection } from '../../../src/handlers/test-utils/test-helpers.js';

describe('FindGameObjectToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: [
        {
          "id": -1000,
          "name": "TestObject",
          "path": "/TestObject"
        }
      ]
    });
    handler = new FindGameObjectToolHandler(mockConnection);
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
      assert.doesNotThrow(() => handler.validate({"name":"TestObject"}));
    });

  });

  describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({"name":"TestObject"});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 1);
    });

    it('should connect if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      mockConnection.connect = mock.fn(async () => {});
      
      await handler.execute({"name":"TestObject"});
      
      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({"name":"TestObject"});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
    });

  });
});