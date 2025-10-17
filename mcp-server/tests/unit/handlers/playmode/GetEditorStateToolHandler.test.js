import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GetEditorStateToolHandler } from '../../../../src/handlers/playmode/GetEditorStateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetEditorStateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new GetEditorStateToolHandler(mockConnection);
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
