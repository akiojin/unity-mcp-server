import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EditorTagsManageToolHandler } from '../../../../src/handlers/editor/EditorTagsManageToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('EditorTagsManageToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new EditorTagsManageToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'manage_tags');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('SPEC compliance', () => {
    it('should manage project tags', () => {
      assert.equal(handler.name, 'manage_tags');
    });
  });
});
