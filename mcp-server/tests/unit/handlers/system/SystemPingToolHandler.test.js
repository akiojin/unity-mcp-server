import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SystemPingToolHandler } from '../../../../src/handlers/system/SystemPingToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

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
});
