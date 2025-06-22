import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ModifyGameObjectToolHandler } from './ModifyGameObjectToolHandler.js';
import { createMockUnityConnection } from './test-helpers.js';

describe('ModifyGameObjectToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        "id": -1000,
        "name": "TestObject",
        "path": "/TestObject",
        "position": {
          "x": 1,
          "y": 2,
          "z": 3
        },
        "modified": true
      }
    });
    handler = new ModifyGameObjectToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.ok(handler.name);
      assert.ok(handler.description);
      assert.deepEqual(handler.inputSchema.required, ["path"]);
    });
  });

  describe('validate', () => {
    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() => handler.validate({"path":"/TestObject","position":{"x":1,"y":2,"z":3}}));
    });

    it('should fail with missing required parameter', () => {
      assert.throws(
        () => handler.validate({}),
        /Missing required parameter: path/
      );
    });
    it('should fail with error: position.x must be a number', () => {
      assert.throws(
        () => handler.validate({"path":"/Test","position":{"x":"1"}}),
        /position.x must be a number/
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({"path":"/TestObject","position":{"x":1,"y":2,"z":3}});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(result.id, -1000);
      assert.equal(result.name, "TestObject");
    });

    it('should connect if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      mockConnection.connect = mock.fn(async () => {});
      
      await handler.execute({"path":"/TestObject","position":{"x":1,"y":2,"z":3}});
      
      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({"path":"/TestObject","position":{"x":1,"y":2,"z":3}});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({});
      
      assert.equal(result.status, 'error');
      assert.match(result.error, /Missing required parameter: path/);
    });
  });
});