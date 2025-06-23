import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { FindByComponentToolHandler } from './FindByComponentToolHandler.js';
import { createMockUnityConnection } from '../test-utils/test-helpers.js';

describe('FindByComponentToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
        mockConnection = createMockUnityConnection({
      sendCommandResult: {
        status: 'success',
        result: {
          objects: [
            {"name":"MainLight","path":"/Lights/MainLight"},
            {"name":"PlayerLight","path":"/Player/PlayerLight"}
          ],
          count: 2,
          summary: "Found 2 objects with Light component"
        }
      }
    });
    handler = new FindByComponentToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.ok(handler.name);
      assert.ok(handler.description);
      assert.deepEqual(handler.inputSchema.required, ["componentType"]);
    });
  });

  describe('validate', () => {
    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() => handler.validate({"componentType":"Light"}));
    });

    it('should fail with missing required parameter', () => {
      assert.throws(
        () => handler.validate({}),
        /Missing required parameter: componentType/
      );
    });
  });

    describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({"componentType":"Light"});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.ok(result);
      assert.ok(result.content);
      assert.equal(result.isError, false);
      assert.ok(result.content[0].text.includes("Found 2 objects"));
    });

    it('should return error if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      
      const result = await handler.execute({"componentType":"Light"});
      
      assert.ok(result);
      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('Unity connection not available'));
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({"componentType":"Light"});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.ok(result.result.content);
      assert.equal(result.result.isError, false);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({});
      
      assert.equal(result.status, 'error');
      assert.match(result.error, /Missing required parameter: componentType/);
    });
  });
});