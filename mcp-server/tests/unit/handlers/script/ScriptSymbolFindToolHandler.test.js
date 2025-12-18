import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptSymbolFindToolHandler } from '../../../../src/handlers/script/ScriptSymbolFindToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';
import { JobManager } from '../../../../src/core/jobManager.js';

describe('ScriptSymbolFindToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptSymbolFindToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'find_script_symbol');
    });
  });

  describe('SPEC compliance', () => {
    it('should find symbol definitions by name', () => {
      assert.equal(handler.name, 'find_script_symbol');
    });
  });

  describe('FR-051: DB index requirement', () => {
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
      assert.ok(result.hint.includes('build_code_index'));
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
              processed: 50,
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
        processed: 50,
        total: 100,
        percentage: 50
      });
    });

    it('should return index_building error with watcher job', async () => {
      // Mock index as not ready
      handler.index.isReady = mock.fn(async () => false);
      // Mock JobManager to return a running watcher job
      const mockJobManager = {
        getAllJobs: mock.fn(() => [
          {
            id: 'watcher-1234567890-abc123',
            status: 'running',
            progress: {
              processed: 10,
              total: 50
            }
          }
        ])
      };
      handler.jobManager = mockJobManager;

      const result = await handler.execute({ name: 'TestClass' });

      assert.equal(result.success, false);
      assert.equal(result.error, 'index_building');
      assert.equal(result.progress.percentage, 20);
    });

    it('should calculate percentage correctly even when total is 0', async () => {
      // Mock index as not ready
      handler.index.isReady = mock.fn(async () => false);
      // Mock JobManager to return a running build job with no total yet
      const mockJobManager = {
        getAllJobs: mock.fn(() => [
          {
            id: 'build-1234567890-abc123',
            status: 'running',
            progress: {
              processed: 0,
              total: 0
            }
          }
        ])
      };
      handler.jobManager = mockJobManager;

      const result = await handler.execute({ name: 'TestClass' });

      assert.equal(result.success, false);
      assert.equal(result.error, 'index_building');
      assert.equal(result.progress.percentage, 0);
    });
  });

  describe('FR-054: index_not_ready with hint', () => {
    it('should include hint about get_code_index_status and build_code_index', async () => {
      // Mock index as not ready
      handler.index.isReady = mock.fn(async () => false);
      // Mock JobManager to return no running jobs
      const mockJobManager = {
        getAllJobs: mock.fn(() => [])
      };
      handler.jobManager = mockJobManager;

      const result = await handler.execute({ name: 'TestClass' });

      assert.equal(result.error, 'index_not_ready');
      assert.ok(result.hint.includes('get_code_index_status'));
      assert.ok(result.hint.includes('build_code_index'));
    });

    it('should not return index_not_ready when a completed job exists but index still not ready', async () => {
      // Mock index as not ready
      handler.index.isReady = mock.fn(async () => false);
      // Mock JobManager to return a completed job (not running)
      const mockJobManager = {
        getAllJobs: mock.fn(() => [
          {
            id: 'build-old-completed',
            status: 'completed',
            progress: { processed: 100, total: 100 }
          }
        ])
      };
      handler.jobManager = mockJobManager;

      const result = await handler.execute({ name: 'TestClass' });

      // Should still return index_not_ready since no running build job
      assert.equal(result.success, false);
      assert.equal(result.error, 'index_not_ready');
    });
  });
});
