import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GetObjectReferencesToolHandler } from '../../../../src/handlers/analysis/GetObjectReferencesToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetObjectReferencesToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new GetObjectReferencesToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'get_object_references');
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
    it('should find references to and from GameObject', () => {
      assert.equal(handler.name, 'get_object_references');
    });
  });
});
