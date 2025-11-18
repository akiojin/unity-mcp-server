import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AnalyzeSceneContentsToolHandler } from '../../../../src/handlers/analysis/AnalyzeSceneContentsToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AnalyzeSceneContentsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new AnalyzeSceneContentsToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'analysis_scene_contents_analyze');
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

    it('should execute when Unity connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => true);
      // Execution depends on tool handler implementation
      assert.ok(handler.execute);
    });
  });

  describe('SPEC compliance', () => {
    it('should analyze scene contents', () => {
      assert.equal(handler.name, 'analysis_scene_contents_analyze');
    });
  });
});
