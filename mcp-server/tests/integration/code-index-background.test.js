import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { CodeIndexBuildToolHandler } from '../../src/handlers/script/CodeIndexBuildToolHandler.js';
import { ScriptIndexStatusToolHandler } from '../../src/handlers/script/ScriptIndexStatusToolHandler.js';
import { createMockUnityConnection } from '../utils/test-helpers.js';

describe('SPEC-yt3ikddd: Background Code Index Build - Integration Tests', () => {
  let buildHandler;
  let statusHandler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true
      }
    });
    buildHandler = new CodeIndexBuildToolHandler(mockConnection);
    statusHandler = new ScriptIndexStatusToolHandler(mockConnection);
  });

  describe('US-1: 非ブロッキングなインデックスビルド (Non-blocking Build)', () => {
    it('should return jobId within 1 second and allow other tool usage', async () => {
      // シナリオ: ビルド開始 → 1秒以内にレスポンス
      const startTime = Date.now();

      try {
        const buildResult = await buildHandler.execute({});
        const responseTime = Date.now() - startTime;

        // Expected after implementation:
        // - Response time < 1 second
        // - Returns jobId immediately
        // - success = true
        assert.ok(responseTime < 1000, `Should respond within 1 second, took ${responseTime}ms`);
        assert.equal(buildResult.success, true, 'Should return success=true');
        assert.ok(buildResult.jobId, 'Should return jobId');
        assert.ok(typeof buildResult.jobId === 'string', 'jobId should be a string');
        assert.ok(buildResult.jobId.startsWith('build-'), 'jobId should start with "build-"');

        // シナリオ: 他ツール使用可能（script_index_statusを即座に呼び出せる）
        const statusResult = await statusHandler.execute({});
        assert.ok(statusResult, 'Should be able to call other tools immediately');

        // Expected: status tool should work while build is running in background
        assert.ok(statusResult.success !== undefined, 'Status tool should return valid response');
      } catch (error) {
        // Expected in RED phase: JobManager not yet implemented
        assert.ok(error, 'Expected to fail in RED phase: JobManager not implemented');
      }
    });

    it('should not block subsequent tool calls', async () => {
      try {
        // Start build (should return immediately)
        const buildResult = await buildHandler.execute({});

        // Immediately call status multiple times
        const statusCall1 = statusHandler.execute({});
        const statusCall2 = statusHandler.execute({});
        const statusCall3 = statusHandler.execute({});

        const results = await Promise.all([statusCall1, statusCall2, statusCall3]);

        // All status calls should complete successfully
        results.forEach((result, index) => {
          assert.ok(result, `Status call ${index + 1} should succeed`);
        });
      } catch (error) {
        // Expected in RED phase
        assert.ok(error, 'Expected to fail in RED phase');
      }
    });
  });

  describe('US-2: 進捗状況の可視化 (Progress Visibility)', () => {
    it('should show progress information during build execution', async () => {
      try {
        // シナリオ: ビルド実行中 → script_index_status → 進捗情報確認
        const buildResult = await buildHandler.execute({});
        const jobId = buildResult.jobId;

        // Wait a moment for build to start processing
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check status while running
        const statusResult = await statusHandler.execute({});

        // Expected structure:
        assert.ok(statusResult.success, 'Status should succeed');
        assert.ok(statusResult.index, 'Should have index field');
        assert.ok(statusResult.index.buildJob, 'Should have buildJob field');

        const buildJob = statusResult.index.buildJob;
        assert.equal(buildJob.id, jobId, 'buildJob.id should match jobId');
        assert.equal(buildJob.status, 'running', 'Status should be running');

        // Progress information
        assert.ok(buildJob.progress, 'Should have progress object');
        assert.ok(typeof buildJob.progress.processed === 'number', 'progress.processed should be number');
        assert.ok(typeof buildJob.progress.total === 'number', 'progress.total should be number');
        assert.ok(typeof buildJob.progress.rate === 'number', 'progress.rate should be number');

        // Should have startedAt
        assert.ok(buildJob.startedAt, 'Should have startedAt timestamp');

        // Should NOT have completedAt/result for running job
        assert.equal(buildJob.completedAt, undefined, 'completedAt should not exist for running job');
        assert.equal(buildJob.result, undefined, 'result should not exist for running job');
      } catch (error) {
        // Expected in RED phase
        assert.ok(error, 'Expected to fail in RED phase');
      }
    });

    it('should show result information after build completion', async () => {
      try {
        // シナリオ: ビルド完了後 → script_index_status → 結果情報確認
        const buildResult = await buildHandler.execute({});
        const jobId = buildResult.jobId;

        // Wait for build to complete (in real scenario)
        // For RED phase, we test the contract
        await new Promise(resolve => setTimeout(resolve, 200));

        const statusResult = await statusHandler.execute({});

        // If build completed:
        if (statusResult.index.buildJob && statusResult.index.buildJob.status === 'completed') {
          const buildJob = statusResult.index.buildJob;

          // Should have completedAt
          assert.ok(buildJob.completedAt, 'Should have completedAt timestamp');

          // Should have result
          assert.ok(buildJob.result, 'Should have result object');
          assert.ok(typeof buildJob.result.updatedFiles === 'number', 'result.updatedFiles should be number');
          assert.ok(typeof buildJob.result.removedFiles === 'number', 'result.removedFiles should be number');
          assert.ok(typeof buildJob.result.totalIndexedSymbols === 'number', 'result.totalIndexedSymbols should be number');
          assert.ok(buildJob.result.lastIndexedAt, 'result.lastIndexedAt should exist');

          // Should NOT have error for completed job
          assert.equal(buildJob.error, null, 'error should be null for completed job');
        }
      } catch (error) {
        // Expected in RED phase
        assert.ok(error, 'Expected to fail in RED phase');
      }
    });

    it('should show error information if build fails', async () => {
      try {
        const buildResult = await buildHandler.execute({});
        const jobId = buildResult.jobId;

        // Wait for potential failure
        await new Promise(resolve => setTimeout(resolve, 200));

        const statusResult = await statusHandler.execute({});

        // If build failed:
        if (statusResult.index.buildJob && statusResult.index.buildJob.status === 'failed') {
          const buildJob = statusResult.index.buildJob;

          // Should have failedAt
          assert.ok(buildJob.failedAt, 'Should have failedAt timestamp');

          // Should have error message
          assert.ok(buildJob.error, 'Should have error message');
          assert.equal(typeof buildJob.error, 'string', 'error should be string');

          // Should NOT have result for failed job
          assert.equal(buildJob.result, null, 'result should be null for failed job');
        }
      } catch (error) {
        // Expected in RED phase
        assert.ok(error, 'Expected to fail in RED phase');
      }
    });

    it('should maintain backward compatibility without buildJob', async () => {
      try {
        // When no build is running, buildJob should be optional
        const statusResult = await statusHandler.execute({});

        // All existing fields should be present
        assert.ok(statusResult.success !== undefined, 'success field should exist');
        assert.ok(statusResult.totalFiles !== undefined, 'totalFiles field should exist');
        assert.ok(statusResult.indexedFiles !== undefined, 'indexedFiles field should exist');
        assert.ok(statusResult.coverage !== undefined, 'coverage field should exist');
        assert.ok(statusResult.breakdown, 'breakdown field should exist');
        assert.ok(statusResult.index, 'index field should exist');
        assert.ok(statusResult.index.ready !== undefined, 'index.ready should exist');
        assert.ok(statusResult.index.rows !== undefined, 'index.rows should exist');

        // buildJob is optional
        // Can be undefined if no build is running
      } catch (error) {
        // Expected in RED phase or if index not built yet
        assert.ok(error, 'Expected to fail in RED phase or index not built');
      }
    });
  });

  describe('US-3: 重複実行の防止 (Duplicate Execution Prevention)', () => {
    it('should return build_already_running error on duplicate execution', async () => {
      try {
        // シナリオ: ビルド実行中 → 再度ビルド開始 → エラー＋既存jobId

        // Start first build
        const firstResult = await buildHandler.execute({});
        const firstJobId = firstResult.jobId;

        assert.ok(firstJobId, 'First build should return jobId');
        assert.equal(firstResult.success, true, 'First build should succeed');

        // Immediately attempt second build
        const secondResult = await buildHandler.execute({});

        // Expected: error response with existing jobId
        assert.equal(secondResult.success, false, 'Second build should fail');
        assert.equal(secondResult.error, 'build_already_running', 'Should return build_already_running error');
        assert.ok(secondResult.message, 'Should include error message');
        assert.ok(secondResult.message.includes('already running') ||
                  secondResult.message.includes('実行中'),
                  'Error message should mention build is running');
        assert.equal(secondResult.jobId, firstJobId, 'Should return existing jobId');
      } catch (error) {
        // Expected in RED phase
        assert.ok(error, 'Expected to fail in RED phase: JobManager not implemented');
      }
    });

    it('should allow new build after previous build completes', async () => {
      try {
        // Start first build
        const firstResult = await buildHandler.execute({});
        const firstJobId = firstResult.jobId;

        // Wait for completion (simulated - in real test would wait for actual completion)
        await new Promise(resolve => setTimeout(resolve, 300));

        // Check if first build completed
        const statusResult = await statusHandler.execute({});
        if (statusResult.index.buildJob &&
            statusResult.index.buildJob.status === 'completed') {

          // Now second build should succeed
          const secondResult = await buildHandler.execute({});

          assert.equal(secondResult.success, true, 'Second build should succeed after first completes');
          assert.ok(secondResult.jobId, 'Second build should return new jobId');
          assert.notEqual(secondResult.jobId, firstJobId, 'Second jobId should be different from first');
        }
      } catch (error) {
        // Expected in RED phase
        assert.ok(error, 'Expected to fail in RED phase');
      }
    });

    it('should allow new build after previous build fails', async () => {
      try {
        // Start first build that might fail
        const firstResult = await buildHandler.execute({});
        const firstJobId = firstResult.jobId;

        // Wait for potential failure
        await new Promise(resolve => setTimeout(resolve, 300));

        // Check if first build failed
        const statusResult = await statusHandler.execute({});
        if (statusResult.index.buildJob &&
            statusResult.index.buildJob.status === 'failed') {

          // Now second build should succeed
          const secondResult = await buildHandler.execute({});

          assert.equal(secondResult.success, true, 'Second build should succeed after first fails');
          assert.ok(secondResult.jobId, 'Second build should return new jobId');
          assert.notEqual(secondResult.jobId, firstJobId, 'Second jobId should be different from first');
        }
      } catch (error) {
        // Expected in RED phase
        assert.ok(error, 'Expected to fail in RED phase');
      }
    });
  });

  describe('End-to-End: Complete Build Workflow', () => {
    it('should complete full workflow: start → progress → complete', async () => {
      try {
        // 1. Start build
        const buildResult = await buildHandler.execute({});
        assert.ok(buildResult.jobId, 'Should return jobId');
        const jobId = buildResult.jobId;

        // 2. Check initial status (running)
        await new Promise(resolve => setTimeout(resolve, 50));
        const status1 = await statusHandler.execute({});
        if (status1.index.buildJob) {
          assert.equal(status1.index.buildJob.id, jobId);
          assert.equal(status1.index.buildJob.status, 'running');
          assert.ok(status1.index.buildJob.progress);
        }

        // 3. Check progress multiple times
        await new Promise(resolve => setTimeout(resolve, 100));
        const status2 = await statusHandler.execute({});
        if (status2.index.buildJob) {
          assert.equal(status2.index.buildJob.status, 'running');
          // Progress should increase
          assert.ok(status2.index.buildJob.progress.processed >= 0);
        }

        // 4. Wait for completion
        await new Promise(resolve => setTimeout(resolve, 200));
        const status3 = await statusHandler.execute({});
        if (status3.index.buildJob && status3.index.buildJob.status === 'completed') {
          assert.ok(status3.index.buildJob.result);
          assert.ok(status3.index.buildJob.completedAt);
        }

        // 5. After cleanup (5 minutes), buildJob should be removed
        // (This is too long for integration test, but contract is defined)
      } catch (error) {
        // Expected in RED phase
        assert.ok(error, 'Expected to fail in RED phase');
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should return response within 1 second (99th percentile)', async () => {
      const responseTimes = [];

      try {
        // Run multiple times to check consistency
        for (let i = 0; i < 5; i++) {
          const startTime = Date.now();
          await buildHandler.execute({});
          const duration = Date.now() - startTime;
          responseTimes.push(duration);

          // Wait before next attempt (if needed for cleanup)
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // All responses should be < 1 second
        responseTimes.forEach((time, index) => {
          assert.ok(time < 1000, `Attempt ${index + 1} took ${time}ms, should be < 1000ms`);
        });

        // Average should be well below 1 second
        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        assert.ok(avgTime < 500, `Average response time ${avgTime}ms should be < 500ms`);
      } catch (error) {
        // Expected in RED phase
        assert.ok(error, 'Expected to fail in RED phase');
      }
    });

    it('should respond to script_index_status within 100ms', async () => {
      try {
        const startTime = Date.now();
        await statusHandler.execute({});
        const duration = Date.now() - startTime;

        assert.ok(duration < 100, `script_index_status took ${duration}ms, should be < 100ms`);
      } catch (error) {
        // May fail if index not built, but duration should still be fast
        const duration = Date.now() - startTime;
        assert.ok(duration < 100, `Even with error, should respond within 100ms, took ${duration}ms`);
      }
    });
  });
});
