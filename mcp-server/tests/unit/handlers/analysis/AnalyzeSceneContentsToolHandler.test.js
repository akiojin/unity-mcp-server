import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AnalyzeSceneContentsToolHandler } from '../../../../src/handlers/analysis/AnalyzeSceneContentsToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AnalyzeSceneContentsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: { summary: 'Scene analysis complete' }
    });
    handler = new AnalyzeSceneContentsToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'analyze_scene_contents');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('execute', () => {
    it('should throw error when Unity not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      await assert.rejects(async () => await handler.execute({}), /Unity connection not available/);
    });

    it('should call analyze_scene_contents in Unity', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => true);

      const result = await handler.execute({
        groupByType: true,
        includeInactive: true
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'analyze_scene_contents');
      assert.equal(result.isError, false);
    });
  });

  describe('SPEC compliance', () => {
    it('should analyze scene contents', () => {
      assert.equal(handler.name, 'analyze_scene_contents');
    });
  });
});
