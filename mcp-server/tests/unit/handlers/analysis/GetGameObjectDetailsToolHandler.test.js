import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GetGameObjectDetailsToolHandler } from '../../../../src/handlers/analysis/GetGameObjectDetailsToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetGameObjectDetailsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        summary: 'GameObject details retrieved'
      }
    });
    handler = new GetGameObjectDetailsToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'analysis_gameobject_details_get');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('execute', () => {
    it('should throw error when Unity not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      await assert.rejects(
        async () => await handler.execute({ gameObjectName: 'Player' }),
        /Unity connection not available/
      );
    });

    it('should call get_gameobject_details in Unity', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => true);

      const result = await handler.execute({ gameObjectName: 'Player' });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'get_gameobject_details');
      assert.equal(result.isError, false);
    });
  });

  describe('SPEC compliance', () => {
    it('should get GameObject details', () => {
      assert.equal(handler.name, 'analysis_gameobject_details_get');
    });
  });
});
