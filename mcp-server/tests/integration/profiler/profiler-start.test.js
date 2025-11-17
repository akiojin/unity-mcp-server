import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProfilerStartToolHandler } from '../../../src/handlers/profiler/ProfilerStartToolHandler.js';
import { ProfilerStopToolHandler } from '../../../src/handlers/profiler/ProfilerStopToolHandler.js';
import { UnityConnection } from '../../../src/core/unityConnection.js';

describe('Profiler Start Contract Tests', () => {
  describe('profiler_start tool', () => {
    it('should start profiling with normal mode and return session info', async () => {
      const connection = new UnityConnection();
      const startHandler = new ProfilerStartToolHandler(connection);
      const stopHandler = new ProfilerStopToolHandler(connection);
      let sessionId = null;

      try {
        const result = await startHandler.execute({
          mode: 'normal',
          recordToFile: true
        });

        // Verify contract: sessionId, isRecording, startedAt, outputPath
        assert.equal(typeof result, 'object', 'Result should be an object');
        assert.equal(typeof result.sessionId, 'string', 'sessionId should be a string');
        assert.equal(result.isRecording, true, 'isRecording should be true');
        assert.equal(typeof result.startedAt, 'string', 'startedAt should be a string (ISO 8601)');
        assert.equal(
          typeof result.outputPath,
          'string',
          'outputPath should be a string when recordToFile=true'
        );
        assert.match(result.outputPath, /\.data$/, 'outputPath should end with .data');

        // Verify sessionId format (GUID without hyphens, 32 hex chars)
        assert.match(result.sessionId, /^[a-f0-9]{32}$/i, 'sessionId should be 32 hex characters');

        // Verify startedAt is valid ISO 8601
        const startedAtDate = new Date(result.startedAt);
        assert.equal(
          isNaN(startedAtDate.getTime()),
          false,
          'startedAt should be valid ISO 8601 date'
        );

        sessionId = result.sessionId;
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

    it('should start profiling with deep mode and recordToFile=false', async () => {
      const connection = new UnityConnection();
      const startHandler = new ProfilerStartToolHandler(connection);
      const stopHandler = new ProfilerStopToolHandler(connection);
      let sessionId = null;

      try {
        const result = await startHandler.execute({
          mode: 'deep',
          recordToFile: false
        });

        assert.equal(typeof result, 'object');
        assert.equal(typeof result.sessionId, 'string');
        assert.equal(result.isRecording, true);
        assert.equal(typeof result.startedAt, 'string');
        assert.equal(result.outputPath, null, 'outputPath should be null when recordToFile=false');

        sessionId = result.sessionId;
      } finally {
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

    it('should reject duplicate start with E_ALREADY_RUNNING error', async () => {
      const connection = new UnityConnection();
      const startHandler = new ProfilerStartToolHandler(connection);
      const stopHandler = new ProfilerStopToolHandler(connection);
      let sessionId = null;

      try {
        // Start first profiling session
        const firstResult = await startHandler.execute({ mode: 'normal' });
        sessionId = firstResult.sessionId;

        // Try to start again (should fail)
        const secondResult = await startHandler.execute({ mode: 'normal' });

        // Verify error response
        assert.equal(typeof secondResult.error, 'string', 'Should return error message');
        assert.match(
          secondResult.error,
          /already running/i,
          'Error should mention already running'
        );
        assert.equal(
          secondResult.code,
          'E_ALREADY_RUNNING',
          'Error code should be E_ALREADY_RUNNING'
        );
        assert.equal(typeof secondResult.sessionId, 'string', 'Should return existing sessionId');
      } finally {
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

    it('should reject invalid mode with E_INVALID_MODE error', async () => {
      const connection = new UnityConnection();
      const startHandler = new ProfilerStartToolHandler(connection);

      try {
        const result = await startHandler.execute({ mode: 'invalid_mode' });

        // Verify error response
        assert.equal(typeof result.error, 'string', 'Should return error message');
        assert.match(result.error, /invalid mode/i, 'Error should mention invalid mode');
        assert.equal(result.code, 'E_INVALID_MODE', 'Error code should be E_INVALID_MODE');
      } finally {
        connection.disconnect();
      }
    });

    it('should reject invalid metrics with E_INVALID_METRICS error', async () => {
      const connection = new UnityConnection();
      const startHandler = new ProfilerStartToolHandler(connection);
      const stopHandler = new ProfilerStopToolHandler(connection);
      let sessionId = null;

      try {
        const result = await startHandler.execute({
          mode: 'normal',
          metrics: ['Invalid Metric Name', 'System Used Memory']
        });

        // If profiling started despite invalid metric, clean up
        if (result.sessionId) {
          sessionId = result.sessionId;
        }

        // Verify error response
        assert.equal(typeof result.error, 'string', 'Should return error message');
        assert.match(result.error, /invalid metric/i, 'Error should mention invalid metrics');
        assert.equal(result.code, 'E_INVALID_METRICS', 'Error code should be E_INVALID_METRICS');
      } finally {
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
