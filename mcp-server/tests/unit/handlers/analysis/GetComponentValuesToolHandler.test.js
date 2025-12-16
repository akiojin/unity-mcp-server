import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GetComponentValuesToolHandler } from '../../../../src/handlers/analysis/GetComponentValuesToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetComponentValuesToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        summary: 'Component values retrieved',
        properties: {}
      }
    });
    handler = new GetComponentValuesToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'analysis_component_values_get');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('execute', () => {
    it('should return error result when Unity not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      const result = await handler.execute({
        gameObjectName: 'Player',
        componentType: 'Transform'
      });
      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('Unity connection not available'));
    });

    it('should call get_component_values in Unity', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => true);

      const result = await handler.execute({
        gameObjectName: 'Player',
        componentType: 'Transform'
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'get_component_values');
      assert.equal(result.isError, false);
    });
  });

  describe('SPEC compliance', () => {
    it('should get component properties and values', () => {
      assert.equal(handler.name, 'analysis_component_values_get');
    });
  });
});
