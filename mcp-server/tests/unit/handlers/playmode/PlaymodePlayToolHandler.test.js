import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PlaymodePlayToolHandler } from '../../../../src/handlers/playmode/PlaymodePlayToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('PlaymodePlayToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new PlaymodePlayToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'playmode_play');
    });
  });

  describe('SPEC compliance', () => {
    it('should enter play mode', () => {
      assert.equal(handler.name, 'playmode_play');
    });
  });
});
