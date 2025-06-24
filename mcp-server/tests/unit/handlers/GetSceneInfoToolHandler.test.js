import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GetSceneInfoToolHandler } from '../../../src/handlers/scene/GetSceneInfoToolHandler.js';
import { createMockUnityConnection } from '../../utils/test-helpers.js';

describe('GetSceneInfoToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        status: 'success',
        result: {
          name: "TestScene",
          path: "Assets/Scenes/TestScene.unity",
          isLoaded: true,
          isDirty: false,
          summary: "Scene: TestScene"
        }
      }
    });
    handler = new GetSceneInfoToolHandler(mockConnection);
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
      assert.doesNotThrow(() => handler.validate({"sceneName":"TestScene"}));
    });

  });

  describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({"sceneName":"TestScene"});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.ok(result);
      assert.ok(result.content);
      assert.equal(result.isError, false);
    });

    it('should return error if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      
      const result = await handler.execute({"sceneName":"TestScene"});
      
      assert.ok(result);
      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('Unity connection not available'));
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({"sceneName":"TestScene"});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.ok(result.result.content);
      assert.equal(result.result.isError, false);
    });

  });
});