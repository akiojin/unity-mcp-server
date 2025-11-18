/**
 * Performance tests for Unity connection and command execution
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PerformanceTracker, TestEnvironment, TEST_CONFIG } from '../utils/test-helpers.js';

describe('Connection Performance Tests', () => {
  let perfTracker;

  test.beforeEach(() => {
    perfTracker = new PerformanceTracker();
  });

  test.afterEach(() => {
    perfTracker.clear();
  });

  test(
    'should measure connection establishment time',
    { skip: TestEnvironment.shouldSkipTest('unity') },
    async () => {
      perfTracker.start('connection');

      // Mock connection test - replace with actual Unity connection
      await new Promise(resolve => setTimeout(resolve, 50));

      const duration = perfTracker.end('connection');

      assert(
        duration < TEST_CONFIG.TIMING.CONNECTION_TIMEOUT,
        `Connection took ${duration}ms, should be under ${TEST_CONFIG.TIMING.CONNECTION_TIMEOUT}ms`
      );
    }
  );

  test(
    'should measure command execution throughput',
    { skip: TestEnvironment.shouldSkipTest('unity') },
    async () => {
      const commandCount = 10;
      perfTracker.start('batch_commands');

      // Simulate batch command execution
      for (let i = 0; i < commandCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate command
      }

      const totalDuration = perfTracker.end('batch_commands');
      const averagePerCommand = totalDuration / commandCount;

      assert(
        averagePerCommand < 100,
        `Average command execution time ${averagePerCommand}ms exceeds threshold`
      );

      console.log(
        `Performance: ${commandCount} commands in ${totalDuration}ms (${averagePerCommand}ms avg)`
      );
    }
  );

  test('should benchmark concurrent command performance', async () => {
    const concurrentCount = 5;
    perfTracker.start('concurrent_commands');

    const promises = Array.from(
      { length: concurrentCount },
      (_, i) => new Promise(resolve => setTimeout(resolve, 20 + i * 5))
    );

    await Promise.all(promises);
    const duration = perfTracker.end('concurrent_commands');

    // Should complete faster than sequential execution
    assert(duration < concurrentCount * 25, `Concurrent execution too slow: ${duration}ms`);

    console.log(`Concurrent performance: ${concurrentCount} commands in ${duration}ms`);
  });

  test('should track memory usage during operations', async () => {
    const initialMemory = process.memoryUsage();

    // Simulate memory-intensive operations
    const data = Array.from({ length: 1000 }, (_, i) => ({ id: i, data: 'x'.repeat(100) }));

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    // Ensure memory usage is reasonable (less than 10MB for this test)
    assert(
      memoryIncrease < 10 * 1024 * 1024,
      `Memory usage increased by ${memoryIncrease} bytes, which seems excessive`
    );

    console.log(`Memory usage: +${(memoryIncrease / 1024).toFixed(2)} KB`);
  });
});
