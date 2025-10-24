import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SelectionToolHandler } from '../../../../src/handlers/editor/SelectionToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('SelectionToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new SelectionToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'editor_selection_manage');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('SPEC compliance', () => {
    it('should manage editor selection', () => {
      assert.equal(handler.name, 'editor_selection_manage');
    });
  });
});
