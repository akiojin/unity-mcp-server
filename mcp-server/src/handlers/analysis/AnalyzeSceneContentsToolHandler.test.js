import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AnalyzeSceneContentsToolHandler } from './AnalyzeSceneContentsToolHandler.js';
import { createMockUnityConnection } from '../test-utils/test-helpers.js';

describe('AnalyzeSceneContentsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        status: 'success',
        result: {
          totalObjects: 10,
          statistics: {
            byType: {
              GameObject: 5,
              Light: 2,
              Camera: 3
            }
          },
          summary: "Scene contains 10 objects: 5 GameObjects, 2 Lights, 3 Cameras"
        }
      }
    });
    handler = new AnalyzeSceneContentsToolHandler(mockConnection);
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
      assert.doesNotThrow(() => handler.validate({"groupByType":true}));
    });

  });

  describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({"groupByType":true});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.ok(result);
      assert.ok(result.content);
      assert.equal(result.isError, false);
      assert.ok(result.content[0].text.includes("Scene contains 10 objects"));
    });

    it('should throw error if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      
      await assert.rejects(
        async () => await handler.execute({"groupByType":true}),
        /Unity connection not available/
      );
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({"groupByType":true});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.ok(result.result.content);
      assert.equal(result.result.isError, false);
    });

  });
});