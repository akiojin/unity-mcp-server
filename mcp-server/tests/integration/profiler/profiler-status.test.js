import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProfilerStartToolHandler } from '../../../src/handlers/profiler/ProfilerStartToolHandler.js';
import { ProfilerStopToolHandler } from '../../../src/handlers/profiler/ProfilerStopToolHandler.js';
import { ProfilerStatusToolHandler } from '../../../src/handlers/profiler/ProfilerStatusToolHandler.js';
import { UnityConnection } from '../../../src/core/unityConnection.js';

describe('Profiler Status Contract Tests', () => {
  describe('profiler_status tool', () => {
    it('should return not recording status when profiler is idle', async () => {
      const connection = new UnityConnection();
      const statusHandler = new ProfilerStatusToolHandler(connection);

      try {
        const result = await statusHandler.execute({});

        // Verify contract: isRecording=false, all fields null/0
        assert.equal(typeof result, 'object', 'Result should be an object');
        assert.equal(result.isRecording, false, 'isRecording should be false');
        assert.equal(result.sessionId, null, 'sessionId should be null when not recording');
        assert.equal(result.startedAt, null, 'startedAt should be null when not recording');
        assert.equal(result.elapsedSec, 0, 'elapsedSec should be 0 when not recording');
        assert.equal(result.remainingSec, null, 'remainingSec should be null when not recording');
      } finally {
        connection.disconnect();
      }
    });

    it('should return recording status with session info when profiler is active', async () => {
      const connection = new UnityConnection();
      const startHandler = new ProfilerStartToolHandler(connection);
      const stopHandler = new ProfilerStopToolHandler(connection);
      const statusHandler = new ProfilerStatusToolHandler(connection);
      let sessionId = null;

      try {
        // Start profiling
        const startResult = await startHandler.execute({
          mode: 'normal',
          recordToFile: true
        });
        sessionId = startResult.sessionId;

        await new Promise(resolve => setTimeout(resolve, 100));

        // Get status
        const result = await statusHandler.execute({});

        // Verify contract: isRecording=true, sessionId, startedAt, elapsedSec
        assert.equal(typeof result, 'object');
        assert.equal(result.isRecording, true, 'isRecording should be true');
        assert.equal(result.sessionId, sessionId, 'sessionId should match started session');
        assert.equal(typeof result.startedAt, 'string', 'startedAt should be ISO 8601 string');
        assert.equal(typeof result.elapsedSec, 'number', 'elapsedSec should be a number');
        assert.ok(result.elapsedSec > 0, 'elapsedSec should be positive');

        // Verify startedAt is valid ISO 8601
        const startedAtDate = new Date(result.startedAt);
        assert.equal(
          isNaN(startedAtDate.getTime()),
          false,
          'startedAt should be valid ISO 8601 date'
        );

        // remainingSec should be null without maxDurationSec
        assert.equal(
          result.remainingSec,
          null,
          'remainingSec should be null without maxDurationSec'
        );
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

    it('should return remainingSec countdown when maxDurationSec is set', async () => {
      const connection = new UnityConnection();
      const startHandler = new ProfilerStartToolHandler(connection);
      const stopHandler = new ProfilerStopToolHandler(connection);
      const statusHandler = new ProfilerStatusToolHandler(connection);
      let sessionId = null;

      try {
        // Start profiling with auto-stop
        const startResult = await startHandler.execute({
          mode: 'normal',
          recordToFile: true,
          maxDurationSec: 10
        });
        sessionId = startResult.sessionId;

        await new Promise(resolve => setTimeout(resolve, 100));

        // Get status
        const result = await statusHandler.execute({});

        // Verify contract with auto-stop
        assert.equal(result.isRecording, true);
        assert.equal(
          typeof result.remainingSec,
          'number',
          'remainingSec should be a number when maxDurationSec is set'
        );
        assert.ok(result.remainingSec > 0, 'remainingSec should be positive');
        assert.ok(result.remainingSec <= 10, 'remainingSec should be <= maxDurationSec');

        // Verify elapsedSec + remainingSec ≈ maxDurationSec
        const totalTime = result.elapsedSec + result.remainingSec;
        assert.ok(
          Math.abs(totalTime - 10) < 1,
          'elapsedSec + remainingSec should equal maxDurationSec (within 1 sec tolerance)'
        );
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

    it('should show updated elapsedSec on successive status calls', async () => {
      const connection = new UnityConnection();
      const startHandler = new ProfilerStartToolHandler(connection);
      const stopHandler = new ProfilerStopToolHandler(connection);
      const statusHandler = new ProfilerStatusToolHandler(connection);
      let sessionId = null;

      try {
        // Start profiling
        const startResult = await startHandler.execute({ mode: 'normal' });
        sessionId = startResult.sessionId;

        await new Promise(resolve => setTimeout(resolve, 100));

        // Get first status
        const status1 = await statusHandler.execute({});
        const elapsed1 = status1.elapsedSec;

        await new Promise(resolve => setTimeout(resolve, 200));

        // Get second status
        const status2 = await statusHandler.execute({});
        const elapsed2 = status2.elapsedSec;

        // Verify elapsedSec increased
        assert.ok(elapsed2 > elapsed1, 'elapsedSec should increase over time');
        assert.ok(
          elapsed2 - elapsed1 >= 0.1,
          'elapsedSec difference should be at least 0.1 seconds'
        );
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
