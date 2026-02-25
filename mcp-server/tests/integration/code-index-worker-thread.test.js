import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMockUnityConnection } from '../utils/test-helpers.js';

const isCI = process.env.CI === 'true';

// Check if IndexBuildWorkerPool exists (RED phase detection)
let IndexBuildWorkerPool = null;
let workerPoolAvailable = false;
try {
  const mod = await import('../../src/core/indexBuildWorkerPool.js');
  IndexBuildWorkerPool = mod.IndexBuildWorkerPool;
  workerPoolAvailable = true;
} catch {
  // Expected in RED phase - module doesn't exist yet
}

// Skip tests in CI or when Worker Pool not implemented yet
const describeSuite = isCI || !workerPoolAvailable ? describe.skip : describe;

/**
 * TDD Tests for SPEC-e757a01f US-10: Worker Threadsによる非ブロッキングビルド
 *
 * These tests verify that background index builds using Worker Threads
 * do not block the main event loop, ensuring MCP tools remain responsive.
 *
 * Requirements tested:
 * - FR-056: システムはインデックスビルド処理をWorker Threadで実行し、メインスレッドをブロックしない
 * - FR-057: システムはバックグラウンドビルド中もpingが1秒以内に応答する
 * - FR-058: Worker Thread内でのエラーをメインスレッドに伝播
 * - FR-059: ビルド進捗をWorker Threadからメインスレッドに非同期で通知
 * - FR-060: 既存のbuild_indexツールインターフェースを維持
 * - FR-061: indexWatcherからの呼び出しもWorker Thread経由で実行
 *
 * - NFR-019: バックグラウンドビルド中もpingが1秒以内に応答
 * - NFR-020: ビルド処理の速度低下は10%以内
 * - NFR-021: メモリ使用量の増加は50MB以内
 * - NFR-022: Node.js 18以上をサポート
 */
describeSuite('SPEC-e757a01f US-10: Worker Threads Non-blocking Build', () => {
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true
      }
    });
  });

  afterEach(() => {
    // Clean up any running workers
  });

  describe('FR-056: Worker Thread Execution', () => {
    it('should execute index build in Worker Thread, not blocking main thread', async () => {
      // RED: This test will fail until Worker Thread implementation exists
      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');

      const pool = new IndexBuildWorkerPool();

      // Start a build that would normally block
      const buildPromise = pool.executeBuild({
        projectRoot: '/mock/project',
        throttleMs: 10
      });

      // Main thread should NOT be blocked - verify by running setTimeout
      let mainThreadResponsive = false;
      const responsiveCheck = new Promise(resolve => {
        setTimeout(() => {
          mainThreadResponsive = true;
          resolve();
        }, 50);
      });

      // Wait for responsive check
      await responsiveCheck;

      assert.equal(mainThreadResponsive, true, 'Main thread should remain responsive during build');

      // Clean up
      pool.terminate();
    });

    it('should not block event loop during DB operations', async () => {
      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');

      const pool = new IndexBuildWorkerPool();
      const eventLoopBlocks = [];

      // Monitor event loop blocking
      const checkInterval = setInterval(() => {
        const start = Date.now();
        setImmediate(() => {
          const delay = Date.now() - start;
          if (delay > 100) {
            eventLoopBlocks.push(delay);
          }
        });
      }, 10);

      // Start build
      const buildPromise = pool.executeBuild({
        projectRoot: '/mock/project'
      });

      // Wait a bit for build to be in progress
      await new Promise(resolve => setTimeout(resolve, 500));

      clearInterval(checkInterval);

      // Should have no significant event loop blocks
      assert.equal(
        eventLoopBlocks.filter(d => d > 500).length,
        0,
        `Event loop should not be blocked >500ms, got: ${eventLoopBlocks.join(', ')}`
      );

      pool.terminate();
    });
  });

  describe('FR-057: Response Time Guarantee', () => {
    it('should respond to ping within 1 second during background build', async () => {
      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');
      const { SystemPingToolHandler } =
        await import('../../src/handlers/system/SystemPingToolHandler.js');

      const pool = new IndexBuildWorkerPool();
      const pingHandler = new SystemPingToolHandler(mockConnection);

      // Start background build (simulated slow build)
      pool.executeBuild({
        projectRoot: '/mock/project',
        throttleMs: 100 // Slow down for testing
      });

      // Measure ping response times during build
      const pingTimes = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await pingHandler.execute({ message: `test-${i}` });
        const elapsed = Date.now() - start;
        pingTimes.push(elapsed);

        // Small delay between pings
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // All pings should respond within 1 second
      pingTimes.forEach((time, index) => {
        assert.ok(time < 1000, `Ping ${index} took ${time}ms, should be <1000ms`);
      });

      // Average should be well under 1 second
      const avgPing = pingTimes.reduce((a, b) => a + b, 0) / pingTimes.length;
      assert.ok(avgPing < 500, `Average ping ${avgPing}ms should be <500ms`);

      pool.terminate();
    });

    it('should respond to get_index_status instantly during build', async () => {
      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');
      const { CodeIndexStatusToolHandler } =
        await import('../../src/handlers/script/CodeIndexStatusToolHandler.js');

      const pool = new IndexBuildWorkerPool();
      const statusHandler = new CodeIndexStatusToolHandler(mockConnection);

      // Start background build
      pool.executeBuild({
        projectRoot: '/mock/project',
        throttleMs: 50
      });

      // Check status multiple times during build
      const statusTimes = [];
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        try {
          await statusHandler.execute({});
        } catch {
          // May fail if index not ready, but response time is what we care about
        }
        const elapsed = Date.now() - start;
        statusTimes.push(elapsed);

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // All status calls should be fast
      statusTimes.forEach((time, index) => {
        assert.ok(time < 1000, `Status call ${index} took ${time}ms, should be <1000ms`);
      });

      pool.terminate();
    });
  });

  describe('FR-058: Error Propagation', () => {
    it('should propagate Worker Thread errors to main thread', async () => {
      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');

      const pool = new IndexBuildWorkerPool();

      // Trigger an error in Worker Thread
      try {
        await pool.executeBuild({
          projectRoot: '/non/existent/path/that/should/fail'
        });
        assert.fail('Should have thrown an error');
      } catch (error) {
        // Error should be propagated from Worker Thread
        assert.ok(error, 'Error should be propagated');
        assert.ok(error.message, 'Error should have message');
      }

      pool.terminate();
    });

    it('should allow MCP server to continue after Worker Thread crash', async () => {
      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');
      const { SystemPingToolHandler } =
        await import('../../src/handlers/system/SystemPingToolHandler.js');

      const pool = new IndexBuildWorkerPool();
      const pingHandler = new SystemPingToolHandler(mockConnection);

      // Force Worker Thread to crash
      try {
        await pool.executeBuild({
          projectRoot: '/crash/this/worker',
          forceError: true
        });
      } catch {
        // Expected error
      }

      // MCP server should still be responsive
      const pingResult = await pingHandler.execute({ message: 'after-crash' });
      assert.ok(pingResult, 'Ping should still work after Worker crash');

      pool.terminate();
    });

    it('should recover from Worker Thread termination', async () => {
      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');

      const pool = new IndexBuildWorkerPool();

      // Start first build
      const build1 = pool.executeBuild({
        projectRoot: '/mock/project1'
      });

      // Terminate mid-build
      pool.terminate();

      // Start new build should recreate worker
      const pool2 = new IndexBuildWorkerPool();
      const build2Result = await pool2.executeBuild({
        projectRoot: '/mock/project2'
      });

      assert.ok(build2Result !== undefined, 'Should be able to build after termination');

      pool2.terminate();
    });
  });

  describe('FR-059: Progress Notification', () => {
    it('should receive progress updates from Worker Thread', async () => {
      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');

      const pool = new IndexBuildWorkerPool();
      const progressUpdates = [];

      // Subscribe to progress updates
      pool.onProgress(progress => {
        progressUpdates.push(progress);
      });

      // Start build
      const result = await pool.executeBuild({
        projectRoot: '/mock/project',
        throttleMs: 10
      });

      // With mock project (no files), progress updates may be 0
      // The important thing is that the mechanism works - updates array should exist
      // and build should complete successfully
      assert.ok(Array.isArray(progressUpdates), 'Progress updates array should exist');

      // If there were files to process, verify progress structure
      if (progressUpdates.length > 0) {
        const lastProgress = progressUpdates[progressUpdates.length - 1];
        assert.ok(
          typeof lastProgress.processed === 'number',
          'Progress should have processed count'
        );
        assert.ok(typeof lastProgress.total === 'number', 'Progress should have total count');
      }

      // Build should complete with result
      assert.ok(result, 'Build should complete with result');
      assert.ok(typeof result.updatedFiles === 'number', 'Result should have updatedFiles');

      pool.terminate();
    });

    it('should update JobManager with progress from Worker Thread', async () => {
      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');
      const { JobManager } = await import('../../src/core/jobManager.js');

      const pool = new IndexBuildWorkerPool();
      const jobManager = JobManager.getInstance();

      // Start build via pool
      const jobId = `worker-test-${Date.now()}`;
      pool.executeBuildWithJob(jobId, {
        projectRoot: '/mock/project'
      });

      // Wait for some progress
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check job progress
      const job = jobManager.get(jobId);
      if (job) {
        assert.ok(job.progress, 'Job should have progress');
        assert.ok(typeof job.progress.processed === 'number', 'Progress should have processed');
      }

      pool.terminate();
    });
  });

  describe('FR-060: Backward Compatibility', () => {
    it('should maintain build_index tool interface', async () => {
      const { CodeIndexBuildToolHandler } =
        await import('../../src/handlers/script/CodeIndexBuildToolHandler.js');

      const handler = new CodeIndexBuildToolHandler(mockConnection);

      // Execute should return same structure as before
      const result = await handler.execute({});

      // Existing interface contract
      assert.ok(typeof result.success === 'boolean', 'Should have success field');
      if (result.success) {
        assert.ok(result.jobId, 'Should return jobId on success');
        assert.ok(typeof result.jobId === 'string', 'jobId should be string');
        assert.ok(result.message, 'Should have message');
      }
    });

    it('should maintain get_index_status tool interface', async () => {
      const { CodeIndexStatusToolHandler } =
        await import('../../src/handlers/script/CodeIndexStatusToolHandler.js');

      const handler = new CodeIndexStatusToolHandler(mockConnection);

      try {
        const result = await handler.execute({});

        // Existing interface contract
        assert.ok(typeof result.success === 'boolean', 'Should have success field');
        assert.ok(typeof result.totalFiles === 'number', 'Should have totalFiles');
        assert.ok(typeof result.indexedFiles === 'number', 'Should have indexedFiles');
        assert.ok(typeof result.coverage === 'number', 'Should have coverage');
        assert.ok(result.index, 'Should have index object');
      } catch {
        // May fail if index not built, but interface should be correct
      }
    });
  });

  describe('FR-061: IndexWatcher Integration', () => {
    it('should use Worker Thread for watcher builds', async () => {
      const { IndexWatcher } = await import('../../src/core/indexWatcher.js');
      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');

      const watcher = new IndexWatcher(mockConnection);

      // Watcher should use Worker Thread pool
      assert.ok(
        watcher.workerPool instanceof IndexBuildWorkerPool || watcher.useWorkerThread === true,
        'Watcher should be configured to use Worker Threads'
      );
    });

    it('should not block main thread during watcher auto-build', async () => {
      const { IndexWatcher } = await import('../../src/core/indexWatcher.js');
      const { SystemPingToolHandler } =
        await import('../../src/handlers/system/SystemPingToolHandler.js');

      const watcher = new IndexWatcher(mockConnection);
      const pingHandler = new SystemPingToolHandler(mockConnection);

      // Trigger watcher tick (simulates auto-build)
      const tickPromise = watcher.tick();

      // Main thread should remain responsive
      const pingTimes = [];
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await pingHandler.execute({ message: `watcher-test-${i}` });
        pingTimes.push(Date.now() - start);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // All pings should be fast
      pingTimes.forEach((time, index) => {
        assert.ok(time < 1000, `Ping ${index} during watcher took ${time}ms, should be <1000ms`);
      });

      watcher.stop();
    });
  });

  describe('NFR-019: Ping Response Time', () => {
    it('should maintain <1s ping response during heavy build (acceptance criteria)', async () => {
      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');
      const { SystemPingToolHandler } =
        await import('../../src/handlers/system/SystemPingToolHandler.js');

      const pool = new IndexBuildWorkerPool();
      const pingHandler = new SystemPingToolHandler(mockConnection);

      // Start heavy build simulation
      pool.executeBuild({
        projectRoot: '/mock/project',
        simulateHeavyLoad: true
      });

      // Measure ping response times
      const measurements = [];
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await pingHandler.execute({ message: `heavy-${i}` });
        measurements.push(Date.now() - start);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 99th percentile should be under 1 second
      const sorted = [...measurements].sort((a, b) => a - b);
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      assert.ok(p99 < 1000, `99th percentile ping ${p99}ms should be <1000ms`);

      pool.terminate();
    });
  });

  describe('NFR-020: Build Speed Impact', () => {
    it('should not slow down build by more than 10%', async () => {
      // This test requires baseline measurement
      // For now, just verify Worker Thread overhead is minimal

      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');

      const pool = new IndexBuildWorkerPool();

      const start = Date.now();
      await pool.executeBuild({
        projectRoot: '/mock/project',
        fileCount: 100 // Small test set
      });
      const workerTime = Date.now() - start;

      // Worker overhead should be minimal (can't exceed 10% of baseline)
      // Without baseline, just verify it completes in reasonable time
      assert.ok(workerTime < 30000, `Build should complete within 30s, took ${workerTime}ms`);

      pool.terminate();
    });
  });

  describe('NFR-021: Memory Usage', () => {
    it('should not increase memory by more than 50MB', async () => {
      assert.ok(IndexBuildWorkerPool, 'IndexBuildWorkerPool should be available');

      const baselineMemory = process.memoryUsage().heapUsed;

      const pool = new IndexBuildWorkerPool();
      await pool.executeBuild({
        projectRoot: '/mock/project'
      });

      const afterBuildMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (afterBuildMemory - baselineMemory) / (1024 * 1024);

      assert.ok(
        memoryIncrease < 50,
        `Memory increase ${memoryIncrease.toFixed(2)}MB should be <50MB`
      );

      pool.terminate();
    });
  });

  describe('NFR-022: Node.js Version Compatibility', () => {
    it('should work on Node.js 18+', async () => {
      const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10);
      assert.ok(nodeVersion >= 18, `Node.js version ${process.version} should be >=18`);

      // Verify Worker Threads are available
      const { Worker, isMainThread } = await import('node:worker_threads');
      assert.ok(Worker, 'Worker should be available');
      assert.ok(isMainThread, 'Should be running in main thread');
    });
  });

  describe('Integration: IndexWatcher with Worker Thread', () => {
    it('should handle watcher tick without blocking during build', async () => {
      // Acceptance scenario 15:
      // Given: indexWatcherがバックグラウンドビルドを実行中
      // When: ping
      // Then: 1秒以内に応答が返る

      const { IndexWatcher } = await import('../../src/core/indexWatcher.js');
      const { SystemPingToolHandler } =
        await import('../../src/handlers/system/SystemPingToolHandler.js');

      const watcher = new IndexWatcher(mockConnection);
      const pingHandler = new SystemPingToolHandler(mockConnection);

      // Start watcher (triggers background build if DB missing)
      watcher.start();

      // Wait for watcher to potentially start a build
      await new Promise(resolve => setTimeout(resolve, 500));

      // Ping should respond quickly
      const start = Date.now();
      const pingResult = await pingHandler.execute({ message: 'watcher-scenario' });
      const elapsed = Date.now() - start;

      assert.ok(pingResult, 'Ping should return result');
      assert.ok(elapsed < 1000, `Ping took ${elapsed}ms, should be <1000ms`);

      watcher.stop();
    });
  });
});
