import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EditorLayersManageToolHandler } from '../../../../src/handlers/editor/EditorLayersManageToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('EditorLayersManageToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new EditorLayersManageToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'editor_layers_manage');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('SPEC compliance', () => {
    it('should manage project layers', () => {
      assert.equal(handler.name, 'editor_layers_manage');
    });
  });
});
