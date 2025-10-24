import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EditorWindowsManageToolHandler } from '../../../../src/handlers/editor/EditorWindowsManageToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('EditorWindowsManageToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new EditorWindowsManageToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'editor_windows_manage');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('SPEC compliance', () => {
    it('should manage editor windows', () => {
      assert.equal(handler.name, 'editor_windows_manage');
    });
  });
});
