import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProfilerStartToolHandler } from '../../../src/handlers/profiler/ProfilerStartToolHandler.js';
import { ProfilerStopToolHandler } from '../../../src/handlers/profiler/ProfilerStopToolHandler.js';
import { UnityConnection } from '../../../src/core/unityConnection.js';

describe('Profiler Stop Contract Tests', () => {
  describe('profiler_stop tool', () => {
    it('should stop profiling and return session summary with file (recordToFile=true)', async () => {
      const connection = new UnityConnection();
      const startHandler = new ProfilerStartToolHandler(connection);
      const stopHandler = new ProfilerStopToolHandler(connection);

      try {
        // Start profiling first
        const startResult = await startHandler.execute({
          mode: 'normal',
          recordToFile: true
        });
        const sessionId = startResult.sessionId;

        // Wait a bit to accumulate some frames
        await new Promise(resolve => setTimeout(resolve, 100));

        // Stop profiling
        const result = await stopHandler.execute({ sessionId });

        // Verify contract: sessionId, outputPath, duration, frameCount
        assert.equal(typeof result, 'object', 'Result should be an object');
        assert.equal(result.sessionId, sessionId, 'sessionId should match');
        assert.equal(typeof result.outputPath, 'string', 'outputPath should be a string');
        assert.match(result.outputPath, /\.data$/, 'outputPath should end with .data');
        assert.equal(typeof result.duration, 'number', 'duration should be a number');
        assert.ok(result.duration > 0, 'duration should be positive');
        assert.equal(typeof result.frameCount, 'number', 'frameCount should be a number');
        assert.ok(result.frameCount >= 0, 'frameCount should be non-negative');
      } finally {
        connection.disconnect();
      }
    });

    it('should stop profiling and return metrics without file (recordToFile=false)', async () => {
      const connection = new UnityConnection();
      const startHandler = new ProfilerStartToolHandler(connection);
      const stopHandler = new ProfilerStopToolHandler(connection);

      try {
        // Start profiling without file recording
        const startResult = await startHandler.execute({
          mode: 'normal',
          recordToFile: false
        });
        const sessionId = startResult.sessionId;

        await new Promise(resolve => setTimeout(resolve, 100));

        // Stop profiling
        const result = await stopHandler.execute({ sessionId });

        // Verify contract
        assert.equal(typeof result, 'object');
        assert.equal(result.sessionId, sessionId);
        assert.equal(result.outputPath, null, 'outputPath should be null when recordToFile=false');
        assert.equal(typeof result.duration, 'number');
        assert.equal(typeof result.frameCount, 'number');
        assert.ok(
          Array.isArray(result.metrics),
          'metrics should be an array when recordToFile=false'
        );
      } finally {
        connection.disconnect();
      }
    });

    it('should reject stop when not recording with E_NOT_RECORDING error', async () => {
      const connection = new UnityConnection();
      const stopHandler = new ProfilerStopToolHandler(connection);

      try {
        const result = await stopHandler.execute({});

        // Verify error response
        assert.equal(typeof result.error, 'string', 'Should return error message');
        assert.match(result.error, /not recording/i, 'Error should mention not recording');
        assert.equal(result.code, 'E_NOT_RECORDING', 'Error code should be E_NOT_RECORDING');
      } finally {
        connection.disconnect();
      }
    });

    it('should reject invalid sessionId with E_INVALID_SESSION error', async () => {
      const connection = new UnityConnection();
      const startHandler = new ProfilerStartToolHandler(connection);
      const stopHandler = new ProfilerStopToolHandler(connection);
      let sessionId = null;

      try {
        // Start a session
        const startResult = await startHandler.execute({ mode: 'normal' });
        sessionId = startResult.sessionId;

        // Try to stop with wrong sessionId
        const result = await stopHandler.execute({ sessionId: 'invalid-session-id' });

        // Verify error response
        assert.equal(typeof result.error, 'string', 'Should return error message');
        assert.match(result.error, /invalid.*session/i, 'Error should mention invalid session');
        assert.equal(result.code, 'E_INVALID_SESSION', 'Error code should be E_INVALID_SESSION');
      } finally {
        // Cleanup
        if (sessionId) {
          try {
            await stopHandler.execute({ sessionId });
          } catch (cleanupError) {
            console.warn(`Failed to stop profiler: ${cleanupError.message}`);
          }
        }
        connection.disconnect();
      }
    });

    it('should handle file IO errors with E_FILE_IO error', async () => {
      const connection = new UnityConnection();
      const startHandler = new ProfilerStartToolHandler(connection);
      const stopHandler = new ProfilerStopToolHandler(connection);
      let sessionId = null;

      try {
        // Start profiling with file recording
        const startResult = await startHandler.execute({
          mode: 'normal',
          recordToFile: true
        });
        sessionId = startResult.sessionId;

        // Note: This test expects Unity implementation to detect file IO errors
        // In practice, file IO errors might occur due to:
        // - Invalid path
        // - Permission issues
        // - Disk full
        // The implementation should handle these gracefully

        await new Promise(resolve => setTimeout(resolve, 100));

        // Stop profiling
        const result = await stopHandler.execute({ sessionId });

        // If file IO error occurs, verify error response
        if (result.error) {
          assert.equal(typeof result.error, 'string');
          assert.equal(result.code, 'E_FILE_IO', 'Error code should be E_FILE_IO for file errors');
        } else {
          // Success case - verify contract
          assert.equal(typeof result.outputPath, 'string');
        }
      } finally {
        // Cleanup
        if (sessionId) {
          try {
            await stopHandler.execute({ sessionId });
          } catch (cleanupError) {
            console.warn(`Failed to stop profiler: ${cleanupError.message}`);
          }
        }
        connection.disconnect();
      }
    });
  });
});
