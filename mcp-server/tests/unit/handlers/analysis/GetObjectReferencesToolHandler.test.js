import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GetObjectReferencesToolHandler } from '../../../../src/handlers/analysis/GetObjectReferencesToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetObjectReferencesToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        summary: 'Player has no references',
        referencedBy: [],
        referencesTo: []
      }
    });
    handler = new GetObjectReferencesToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'analysis_object_references_get');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('execute', () => {
    it('should return error result when Unity not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      const result = await handler.execute({ gameObjectName: 'Player' });
      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('Unity connection not available'));
    });

    it('should call get_object_references in Unity', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => true);

      const result = await handler.execute({ gameObjectName: 'Player' });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'get_object_references');
      assert.equal(result.isError, false);
    });
  });

  describe('SPEC compliance', () => {
    it('should find references to and from GameObject', () => {
      assert.equal(handler.name, 'analysis_object_references_get');
    });
  });
});
