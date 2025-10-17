import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ReadLogsToolHandler } from '../../../src/handlers/system/ReadLogsToolHandler.js';
import { createMockUnityConnection } from '../../utils/test-helpers.js';

describe('ReadLogsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        "logs": [
          {
            "message": "Test error",
            "type": "Error",
            "timestamp": "2024-01-01T00:00:00.000Z",
            "stackTrace": "at Test.cs:10"
          }
        ],
        "totalCount": 1
      }
    });
    handler = new ReadLogsToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.ok(handler.name);
      assert.ok(handler.description);
      assert.equal(handler.inputSchema.required, undefined);
    });
  });

  describe('validate', () => {
    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() => handler.validate({"count":10,"logType":"Error"}));
    });

    it('should fail with error: count must be between 1 and 1000', () => {
      assert.throws(
        () => handler.validate({"count":1001}),
        /count must be a number between 1 and 1000/
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({"count":10,"logType":"Error"});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.deepEqual(result.logs, [{"message":"Test error","type":"Error","timestamp":"2024-01-01T00:00:00.000Z","stackTrace":"at Test.cs:10"}]);
      assert.equal(result.totalCount, 1);
    });

    it('should connect if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      mockConnection.connect = mock.fn(async () => {});
      
      await handler.execute({"count":10,"logType":"Error"});
      
      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({"count":10,"logType":"Error"});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({"count":1001});
      
      assert.equal(result.status, 'error');
      assert.match(result.error, /count must be a number between 1 and 1000/);
    });
  });
});