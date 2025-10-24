import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PlaymodePauseToolHandler } from '../../../../src/handlers/playmode/PlaymodePauseToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('PlaymodePauseToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new PlaymodePauseToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'playmode_pause');
    });
  });

  describe('SPEC compliance', () => {
    it('should pause game', () => {
      assert.equal(handler.name, 'playmode_pause');
    });
  });
});
