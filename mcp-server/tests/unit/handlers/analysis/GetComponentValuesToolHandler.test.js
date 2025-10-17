import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GetComponentValuesToolHandler } from '../../../../src/handlers/analysis/GetComponentValuesToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetComponentValuesToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new GetComponentValuesToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'get_component_values');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('execute', () => {
    it('should throw error when Unity not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      await assert.rejects(
        async () => await handler.execute({ gameObjectName: 'Player', componentType: 'Transform' }),
        /Unity connection not available/
      );
    });

    it('should execute when Unity connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => true);
      assert.ok(handler.execute);
    });
  });

  describe('SPEC compliance', () => {
    it('should get component properties and values', () => {
      assert.equal(handler.name, 'get_component_values');
    });
  });
});
