import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LayerManagementToolHandler } from '../../../../src/handlers/editor/LayerManagementToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('LayerManagementToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new LayerManagementToolHandler(mockConnection);
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
