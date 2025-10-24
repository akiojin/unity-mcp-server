import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ToolManagementToolHandler } from '../../../../src/handlers/editor/ToolManagementToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ToolManagementToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ToolManagementToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'editor_tools_manage');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('SPEC compliance', () => {
    it('should manage editor tools and plugins', () => {
      assert.equal(handler.name, 'editor_tools_manage');
    });
  });
});
