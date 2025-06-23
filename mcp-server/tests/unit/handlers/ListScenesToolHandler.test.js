import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ListScenesToolHandler } from '../../../src/handlers/scene/ListScenesToolHandler.js';
import { createMockUnityConnection } from '../../../src/handlers/test-utils/test-helpers.js';

describe('ListScenesToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
        mockConnection = createMockUnityConnection({
      sendCommandResult: {
        status: 'success',
        result: {
          scenes: [
            {"name":"MainMenu","path":"Assets/Scenes/MainMenu.unity","buildIndex":0},
            {"name":"Level1","path":"Assets/Scenes/Level1.unity","buildIndex":1}
          ]
        }
      }
    });
    handler = new ListScenesToolHandler(mockConnection);
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
      assert.doesNotThrow(() => handler.validate({"includeBuildScenesOnly":true}));
    });

  });

    describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.ok(result);
      assert.ok(result.scenes);
      assert.equal(result.scenes.length, 2);
      assert.equal(result.scenes[0].name, "MainMenu");
      assert.equal(result.scenes[1].name, "Level1");
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
      const result = await handler.handle({"includeBuildScenesOnly":true});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.ok(result.result.scenes);
      assert.equal(result.result.scenes.length, 2);
    });

  });
});