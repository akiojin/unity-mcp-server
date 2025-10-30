import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

describe('JobManager', () => {
  let JobManager;
  let jobManager;

  beforeEach(async () => {
    // Dynamic import to handle module availability
    try {
      const module = await import('../../../src/core/jobManager.js');
      JobManager = module.JobManager;
      jobManager = new JobManager();
    } catch (e) {
      // JobManager not yet implemented - this is expected in RED phase
      JobManager = null;
      jobManager = null;
    }
  });

  describe('Contract: JobManager class definition', () => {
    it('should have JobManager class exported', async () => {
      try {
        const module = await import('../../../src/core/jobManager.js');
        assert.ok(module.JobManager, 'JobManager class should be exported');
        assert.equal(typeof module.JobManager, 'function', 'JobManager should be a constructor');
      } catch (e) {
        assert.fail(`JobManager module should exist: ${e.message}`);
      }
    });

    it('should construct without parameters', () => {
      if (!JobManager) {
        assert.fail('JobManager class not available - expected in RED phase');
      }
      assert.ok(jobManager, 'JobManager should be constructable');
      assert.ok(jobManager.jobs instanceof Map, 'JobManager should have jobs Map');
    });
  });

  describe('Contract: create() method', () => {
    it('should accept jobId and jobFn parameters', () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }
      assert.equal(typeof jobManager.create, 'function', 'create() should be a function');
    });

    it('should return jobId immediately', async () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }

      const jobId = 'test-job-123';
      const jobFn = async (job) => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 100));
        return { result: 'success' };
      };

      const returnedJobId = jobManager.create(jobId, jobFn);
      assert.equal(returnedJobId, jobId, 'create() should return jobId immediately');
    });

    it('should create job with status=running', () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }

      const jobId = 'test-job-status';
      const jobFn = async () => {};

      jobManager.create(jobId, jobFn);
      const job = jobManager.get(jobId);

      assert.ok(job, 'Job should be created');
      assert.equal(job.status, 'running', 'Initial status should be running');
      assert.equal(job.id, jobId, 'Job ID should match');
      assert.ok(job.startedAt, 'startedAt should be set');
    });

    it('should initialize progress to 0/0/0', () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }

      const jobId = 'test-job-progress';
      const jobFn = async () => {};

      jobManager.create(jobId, jobFn);
      const job = jobManager.get(jobId);

      assert.deepEqual(job.progress, {
        processed: 0,
        total: 0,
        rate: 0
      }, 'Initial progress should be 0/0/0');
    });

    it('should execute jobFn in background', async () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }

      const jobId = 'test-job-background';
      let executed = false;
      const jobFn = async (job) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        executed = true;
        return { done: true };
      };

      jobManager.create(jobId, jobFn);

      // Job should not be executed synchronously
      assert.equal(executed, false, 'Job should not execute synchronously');

      // Wait for background execution
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.equal(executed, true, 'Job should execute in background');
    });
  });

  describe('Contract: get() method', () => {
    it('should accept jobId parameter', () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }
      assert.equal(typeof jobManager.get, 'function', 'get() should be a function');
    });

    it('should return BuildJob object', () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }

      const jobId = 'test-job-get';
      jobManager.create(jobId, async () => {});

      const job = jobManager.get(jobId);
      assert.ok(job, 'get() should return job object');
      assert.equal(job.id, jobId, 'Returned job should have correct ID');
    });

    it('should return undefined for non-existent job', () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }

      const job = jobManager.get('non-existent-job');
      assert.equal(job, undefined, 'get() should return undefined for non-existent job');
    });
  });

  describe('Contract: job.status transitions', () => {
    it('should transition from running to completed on success', async () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }

      const jobId = 'test-job-complete';
      const jobFn = async (job) => {
        job.progress = { processed: 10, total: 10, rate: 5.0 };
        return { updatedFiles: 10, removedFiles: 0 };
      };

      jobManager.create(jobId, jobFn);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 50));

      const job = jobManager.get(jobId);
      assert.equal(job.status, 'completed', 'Status should be completed');
      assert.ok(job.result, 'result should be set');
      assert.ok(job.completedAt, 'completedAt should be set');
      assert.equal(job.error, null, 'error should be null');
    });

    it('should transition from running to failed on error', async () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }

      const jobId = 'test-job-fail';
      const jobFn = async () => {
        throw new Error('Test error');
      };

      jobManager.create(jobId, jobFn);

      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 50));

      const job = jobManager.get(jobId);
      assert.equal(job.status, 'failed', 'Status should be failed');
      assert.ok(job.error, 'error should be set');
      assert.equal(job.error, 'Test error', 'error message should match');
      assert.ok(job.failedAt, 'failedAt should be set');
      assert.equal(job.result, null, 'result should be null');
    });
  });

  describe('Contract: cleanup() method', () => {
    it('should accept jobId and retentionMs parameters', () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }
      assert.equal(typeof jobManager.cleanup, 'function', 'cleanup() should be a function');
    });

    it('should delete job after retentionMs', async () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }

      const jobId = 'test-job-cleanup';
      jobManager.create(jobId, async () => ({ done: true }));

      // Wait for job to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Trigger cleanup with short retention
      jobManager.cleanup(jobId, 100);

      // Job should exist immediately
      assert.ok(jobManager.get(jobId), 'Job should exist before cleanup');

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 150));

      // Job should be deleted
      assert.equal(jobManager.get(jobId), undefined, 'Job should be deleted after retention period');
    });

    it('should use default retentionMs of 300000 (5 minutes)', () => {
      if (!jobManager) {
        assert.fail('JobManager not available - expected in RED phase');
      }

      const jobId = 'test-job-default-retention';
      jobManager.create(jobId, async () => {});

      // This test just verifies the method signature accepts optional parameter
      // We don't wait 5 minutes to verify actual cleanup
      jobManager.cleanup(jobId); // Should not throw with default parameter
      assert.ok(true, 'cleanup() should accept optional retentionMs parameter');
    });
  });
});
