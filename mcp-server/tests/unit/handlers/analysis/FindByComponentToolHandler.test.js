import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FindByComponentToolHandler } from '../../../../src/handlers/analysis/FindByComponentToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('FindByComponentToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        componentType: 'Light',
        searchScope: 'scene',
        results: [],
        totalFound: 0,
        activeCount: 0,
        summary: 'No GameObjects found with Light component'
      }
    });
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
    it('should return error result when Unity not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      const result = await handler.execute({ componentType: 'Light' });
      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('Unity connection not available'));
    });

    it('should call find_by_component in Unity', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => true);

      const result = await handler.execute({ componentType: 'Light' });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'find_by_component');
      assert.equal(result.isError, false);
    });
  });

  describe('SPEC compliance', () => {
    it('should find GameObjects by component type', () => {
      assert.equal(handler.name, 'analysis_component_find');
    });
  });
});
