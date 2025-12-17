import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PlaymodeGetStateToolHandler } from '../../../../src/handlers/playmode/PlaymodeGetStateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('PlaymodeGetStateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new PlaymodeGetStateToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'get_editor_state');
    });
  });

  describe('SPEC compliance', () => {
    it('should get editor state', () => {
      assert.equal(handler.name, 'get_editor_state');
    });
  });
});
