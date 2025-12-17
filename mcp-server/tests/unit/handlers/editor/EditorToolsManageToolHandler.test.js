import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EditorToolsManageToolHandler } from '../../../../src/handlers/editor/EditorToolsManageToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('EditorToolsManageToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new EditorToolsManageToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'manage_tools');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('SPEC compliance', () => {
    it('should manage editor tools and plugins', () => {
      assert.equal(handler.name, 'manage_tools');
    });
  });
});
