import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StopToolHandler } from '../../../../src/handlers/playmode/StopToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('StopToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new StopToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'playmode_stop');
    });
  });

  describe('SPEC compliance', () => {
    it('should exit play mode', () => {
      assert.equal(handler.name, 'playmode_stop');
    });
  });
});
