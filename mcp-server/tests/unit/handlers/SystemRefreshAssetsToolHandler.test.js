import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { SystemRefreshAssetsToolHandler } from '../../../src/handlers/system/SystemRefreshAssetsToolHandler.js';
import { createMockUnityConnection } from '../../utils/test-helpers.js';

describe('SystemRefreshAssetsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        "success": true,
        "message": "Assets refreshed successfully",
        "compilationStatus": "Success"
      }
    });
    handler = new SystemRefreshAssetsToolHandler(mockConnection);
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
      assert.doesNotThrow(() => handler.validate({}));
    });

  });

  describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.ok(result);  // Handler returns the raw Unity response
      // Message is added by handler if present in Unity response
    });

    it('should connect if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      mockConnection.connect = mock.fn(async () => {});
      
      await handler.execute({});
      
      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
    });

  });
});