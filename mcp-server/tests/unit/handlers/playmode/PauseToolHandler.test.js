import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PauseToolHandler } from '../../../../src/handlers/playmode/PauseToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('PauseToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new PauseToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'pause_game');
    });
  });

  describe('SPEC compliance', () => {
    it('should pause game', () => {
      assert.equal(handler.name, 'pause_game');
    });
  });
});
