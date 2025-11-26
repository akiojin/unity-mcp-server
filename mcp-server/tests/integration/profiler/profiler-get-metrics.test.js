import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProfilerGetMetricsToolHandler } from '../../../src/handlers/profiler/ProfilerGetMetricsToolHandler.js';
import { UnityConnection } from '../../../src/core/unityConnection.js';

describe('Profiler Get Metrics Contract Tests', () => {
  describe('profiler_get_metrics tool', () => {
    it('should list available metrics grouped by category when listAvailable=true', async () => {
      const connection = new UnityConnection();
      const handler = new ProfilerGetMetricsToolHandler(connection);

      try {
        const result = await handler.execute({ listAvailable: true });

        // Verify contract: categories object with arrays of metric names
        assert.equal(typeof result, 'object', 'Result should be an object');
        assert.equal(typeof result.categories, 'object', 'Should have categories object');

        // Verify required categories exist
        assert.ok('Memory' in result.categories, 'Should have Memory category');
        assert.ok('Rendering' in result.categories, 'Should have Rendering category');
        assert.ok('CPU' in result.categories, 'Should have CPU category');
        assert.ok('GC' in result.categories, 'Should have GC category');

        // Verify each category is an array
        assert.ok(Array.isArray(result.categories.Memory), 'Memory should be an array');
        assert.ok(Array.isArray(result.categories.Rendering), 'Rendering should be an array');
        assert.ok(Array.isArray(result.categories.CPU), 'CPU should be an array');
        assert.ok(Array.isArray(result.categories.GC), 'GC should be an array');

        // Verify categories contain metric names (strings)
        assert.ok(result.categories.Memory.length > 0, 'Memory category should not be empty');
        assert.equal(
          typeof result.categories.Memory[0],
          'string',
          'Memory metrics should be strings'
        );

        // Verify some known metrics exist
        const allMetrics = Object.values(result.categories).flat();
        assert.ok(allMetrics.includes('System Used Memory'), 'Should include System Used Memory');
        assert.ok(allMetrics.includes('Draw Calls Count'), 'Should include Draw Calls Count');
        assert.ok(
          allMetrics.includes('GC Allocated In Frame'),
          'Should include GC Allocated In Frame'
        );
      } finally {
        connection.disconnect();
      }
    });

    it('should return all current metric values when listAvailable=false and metrics is empty', async () => {
      const connection = new UnityConnection();
      const handler = new ProfilerGetMetricsToolHandler(connection);

      try {
        const result = await handler.execute({
          listAvailable: false,
          metrics: []
        });

        // Verify contract: metrics array with name/value/unit
        assert.equal(typeof result, 'object');
        assert.ok(Array.isArray(result.metrics), 'Should return metrics array');
        assert.ok(result.metrics.length > 0, 'Should return at least some metrics');

        // Verify metric structure
        const firstMetric = result.metrics[0];
        assert.equal(typeof firstMetric.name, 'string', 'Metric should have name');
        assert.equal(typeof firstMetric.value, 'number', 'Metric should have numeric value');
        assert.equal(typeof firstMetric.unit, 'string', 'Metric should have unit');

        // Verify some known metrics are present
        const metricNames = result.metrics.map(m => m.name);
        assert.ok(metricNames.includes('System Used Memory'), 'Should include System Used Memory');
      } finally {
        connection.disconnect();
      }
    });

    it('should return only requested metrics when listAvailable=false and metrics specified', async () => {
      const connection = new UnityConnection();
      const handler = new ProfilerGetMetricsToolHandler(connection);

      try {
        const requestedMetrics = ['System Used Memory', 'Draw Calls Count'];
        const result = await handler.execute({
          listAvailable: false,
          metrics: requestedMetrics
        });

        // Verify contract: only requested metrics returned
        assert.equal(typeof result, 'object');
        assert.ok(Array.isArray(result.metrics), 'Should return metrics array');
        assert.equal(
          result.metrics.length,
          requestedMetrics.length,
          'Should return exact number of requested metrics'
        );

        // Verify returned metrics match requested
        const returnedNames = result.metrics.map(m => m.name);
        for (const requestedName of requestedMetrics) {
          assert.ok(returnedNames.includes(requestedName), `Should include ${requestedName}`);
        }

        // Verify each metric has valid structure
        for (const metric of result.metrics) {
          assert.equal(typeof metric.name, 'string');
          assert.equal(typeof metric.value, 'number');
          assert.equal(typeof metric.unit, 'string');
        }
      } finally {
        connection.disconnect();
      }
    });

    it('should reject invalid metric names with E_INVALID_METRICS error', async () => {
      const connection = new UnityConnection();
      const handler = new ProfilerGetMetricsToolHandler(connection);

      try {
        const result = await handler.execute({
          listAvailable: false,
          metrics: ['Invalid Metric Name', 'System Used Memory']
        });

        // Verify error response
        assert.equal(typeof result.error, 'string', 'Should return error message');
        assert.match(result.error, /invalid metric/i, 'Error should mention invalid metrics');
        assert.equal(result.code, 'E_INVALID_METRICS', 'Error code should be E_INVALID_METRICS');
        assert.ok(
          Array.isArray(result.invalidMetrics),
          'Should return array of invalid metric names'
        );
        assert.ok(
          result.invalidMetrics.includes('Invalid Metric Name'),
          'Should list invalid metric name'
        );
      } finally {
        connection.disconnect();
      }
    });

    it('should return metric values with correct units', async () => {
      const connection = new UnityConnection();
      const handler = new ProfilerGetMetricsToolHandler(connection);

      try {
        const result = await handler.execute({
          listAvailable: false,
          metrics: ['System Used Memory', 'Draw Calls Count']
        });

        // Verify units are appropriate
        const memoryMetric = result.metrics.find(m => m.name === 'System Used Memory');
        const drawCallsMetric = result.metrics.find(m => m.name === 'Draw Calls Count');

        assert.ok(memoryMetric, 'Should include System Used Memory');
        assert.ok(drawCallsMetric, 'Should include Draw Calls Count');

        // Memory should be in bytes or MB
        assert.match(memoryMetric.unit, /(bytes?|MB|GB)/i, 'Memory unit should be bytes/MB/GB');

        // Draw calls should be count
        assert.match(drawCallsMetric.unit, /count/i, 'Draw calls unit should be count');
      } finally {
        connection.disconnect();
      }
    });
  });
});
