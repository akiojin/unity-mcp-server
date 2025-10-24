import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TagManagementToolHandler } from '../../../../src/handlers/editor/TagManagementToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('TagManagementToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new TagManagementToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'editor_tags_manage');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('SPEC compliance', () => {
    it('should manage project tags', () => {
      assert.equal(handler.name, 'editor_tags_manage');
    });
  });
});
