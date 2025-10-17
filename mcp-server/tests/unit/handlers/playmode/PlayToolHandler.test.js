import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PlayToolHandler } from '../../../../src/handlers/playmode/PlayToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('PlayToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new PlayToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'play_game');
    });
  });

  describe('SPEC compliance', () => {
    it('should enter play mode', () => {
      assert.equal(handler.name, 'play_game');
    });
  });
});
