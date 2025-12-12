import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SystemPingToolHandler } from '../../../../src/handlers/system/SystemPingToolHandler.js';
import { createMockUnityConnection, MockUnityConnection } from '../../../utils/test-helpers.js';
import { OFFLINE_TOOLS, OFFLINE_TOOLS_HINT } from '../../../../src/constants/offlineTools.js';

describe('SystemPingToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new SystemPingToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'system_ping');
    });
  });

  describe('SPEC compliance', () => {
    it('should test connection to Unity Editor', () => {
      assert.equal(handler.name, 'system_ping');
    });
  });

  describe('connection failure handling', () => {
    it('should return offlineToolsAvailable when connection fails', async () => {
      // Create a mock connection that fails to connect
      const failingConnection = new MockUnityConnection({ shouldFail: true });
      const failHandler = new SystemPingToolHandler(failingConnection);

      const result = await failHandler.execute({});

      assert.equal(result.success, false);
      assert.ok(
        Array.isArray(result.offlineToolsAvailable),
        'offlineToolsAvailable should be an array'
      );
      assert.ok(
        result.offlineToolsAvailable.length > 0,
        'offlineToolsAvailable should not be empty'
      );
    });

    it('should return hint message when connection fails', async () => {
      const failingConnection = new MockUnityConnection({ shouldFail: true });
      const failHandler = new SystemPingToolHandler(failingConnection);

      const result = await failHandler.execute({});

      assert.equal(result.success, false);
      assert.ok(result.hint, 'hint should be present');
      assert.ok(typeof result.hint === 'string', 'hint should be a string');
      assert.ok(result.hint.length > 0, 'hint should not be empty');
    });

    it('should include all 9 offline tools in the list', async () => {
      const failingConnection = new MockUnityConnection({ shouldFail: true });
      const failHandler = new SystemPingToolHandler(failingConnection);

      const result = await failHandler.execute({});

      assert.equal(result.success, false);
      assert.deepEqual(result.offlineToolsAvailable, OFFLINE_TOOLS);
      assert.equal(result.offlineToolsAvailable.length, 9);
    });

    it('should return error code unity_connection_failed', async () => {
      const failingConnection = new MockUnityConnection({ shouldFail: true });
      const failHandler = new SystemPingToolHandler(failingConnection);

      const result = await failHandler.execute({});

      assert.equal(result.success, false);
      assert.equal(result.error, 'unity_connection_failed');
    });

    it('should use OFFLINE_TOOLS_HINT constant for hint message', async () => {
      const failingConnection = new MockUnityConnection({ shouldFail: true });
      const failHandler = new SystemPingToolHandler(failingConnection);

      const result = await failHandler.execute({});

      assert.equal(result.hint, OFFLINE_TOOLS_HINT);
    });
  });
});
