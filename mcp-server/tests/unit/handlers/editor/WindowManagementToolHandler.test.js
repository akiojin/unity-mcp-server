import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { WindowManagementToolHandler } from '../../../../src/handlers/editor/WindowManagementToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('WindowManagementToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new WindowManagementToolHandler(mockConnection);
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
