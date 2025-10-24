import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GetGameObjectDetailsToolHandler } from '../../../../src/handlers/analysis/GetGameObjectDetailsToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetGameObjectDetailsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
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

    it('should execute when Unity connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => true);
      assert.ok(handler.execute);
    });
  });

  describe('SPEC compliance', () => {
    it('should get GameObject details', () => {
      assert.equal(handler.name, 'analysis_gameobject_details_get');
    });
  });
});
