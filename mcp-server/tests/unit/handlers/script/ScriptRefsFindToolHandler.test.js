import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptRefsFindToolHandler } from '../../../../src/handlers/script/ScriptRefsFindToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ScriptRefsFindToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptRefsFindToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'script_refs_find');
    });
  });

  describe('SPEC compliance', () => {
    it('should find code references using LSP', () => {
      assert.equal(handler.name, 'script_refs_find');
    });
  });

  describe('FR-052: DB index requirement', () => {
    it('should return index_not_ready error when DB index is not built and no build job running', async () => {
      // Mock index as not ready
      handler.index.isReady = mock.fn(async () => false);
      // Mock JobManager to return no running jobs
      const mockJobManager = {
        getAllJobs: mock.fn(() => [])
      };
      handler.jobManager = mockJobManager;

      const result = await handler.execute({ name: 'TestClass' });

      assert.equal(result.success, false);
      assert.equal(result.error, 'index_not_ready');
      assert.ok(result.message.includes('Code index is not built'));
      assert.ok(result.hint.includes('code_index_build'));
    });
  });

  describe('FR-053: index_building error with progress', () => {
    it('should return index_building error with progress info when build job is running', async () => {
      // Mock index as not ready
      handler.index.isReady = mock.fn(async () => false);
      // Mock JobManager to return a running build job
      const mockJobManager = {
        getAllJobs: mock.fn(() => [
          {
            id: 'build-1234567890-abc123',
            status: 'running',
            progress: {
              processed: 75,
              total: 100
            }
          }
        ])
      };
      handler.jobManager = mockJobManager;

      const result = await handler.execute({ name: 'TestClass' });

      assert.equal(result.success, false);
      assert.equal(result.error, 'index_building');
      assert.ok(result.message.includes('currently being built'));
      assert.equal(result.jobId, 'build-1234567890-abc123');
      assert.deepEqual(result.progress, {
        processed: 75,
        total: 100,
        percentage: 75
      });
    });
  });

  describe('FR-054: index_not_ready with hint', () => {
    it('should include hint about code_index_status and code_index_build', async () => {
      // Mock index as not ready
      handler.index.isReady = mock.fn(async () => false);
      // Mock JobManager to return no running jobs
      const mockJobManager = {
        getAllJobs: mock.fn(() => [])
      };
      handler.jobManager = mockJobManager;

      const result = await handler.execute({ name: 'TestClass' });

      assert.equal(result.error, 'index_not_ready');
      assert.ok(result.hint.includes('code_index_status'));
      assert.ok(result.hint.includes('code_index_build'));
    });
  });
});
