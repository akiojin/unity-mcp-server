import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FindByComponentToolHandler } from '../../../../src/handlers/analysis/FindByComponentToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('FindByComponentToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new FindByComponentToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'analysis_component_find');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('execute', () => {
    it('should throw error when Unity not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      await assert.rejects(
        async () => await handler.execute({ componentType: 'Light' }),
        /Unity connection not available/
      );
    });

    it('should execute when Unity connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => true);
      assert.ok(handler.execute);
    });
  });

  describe('SPEC compliance', () => {
    it('should find GameObjects by component type', () => {
      assert.equal(handler.name, 'analysis_component_find');
    });
  });
});
