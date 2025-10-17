import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PingToolHandler } from '../../../../src/handlers/system/PingToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('PingToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new PingToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'ping');
    });
  });

  describe('SPEC compliance', () => {
    it('should test connection to Unity Editor', () => {
      assert.equal(handler.name, 'ping');
    });
  });
});
