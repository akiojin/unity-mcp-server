import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GetHierarchyToolHandler } from '../../../src/handlers/gameobject/GetHierarchyToolHandler.js';
import { createMockUnityConnection } from '../../../src/handlers/test-utils/test-helpers.js';

describe('GetHierarchyToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        "sceneName": "TestScene",
        "objectCount": 2,
        "hierarchy": [
          {
            "name": "Object1",
            "path": "/Object1"
          },
          {
            "name": "Object2",
            "path": "/Object2"
          }
        ]
      }
    });
    handler = new GetHierarchyToolHandler(mockConnection);
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
      assert.doesNotThrow(() => handler.validate({"includeComponents":true}));
    });

  });

  describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({"includeComponents":true});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(result.sceneName, "TestScene");
      assert.equal(result.objectCount, 2);
    });

    it('should connect if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      mockConnection.connect = mock.fn(async () => {});
      
      await handler.execute({"includeComponents":true});
      
      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({"includeComponents":true});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
    });

  });
});