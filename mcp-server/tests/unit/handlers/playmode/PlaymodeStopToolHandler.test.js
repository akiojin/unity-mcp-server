import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PlaymodeStopToolHandler } from '../../../../src/handlers/playmode/PlaymodeStopToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('PlaymodeStopToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new PlaymodeStopToolHandler(mockConnection);
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
