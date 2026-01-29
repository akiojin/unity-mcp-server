import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildProgress, getReportEvery } from '../../../src/core/indexProgress.js';

describe('indexProgress', () => {
  it('should default phase to index', () => {
    const result = buildProgress({ processed: 1, total: 2, rate: 3 });
    assert.equal(result.phase, 'index');
  });

  it('should preserve explicit phase', () => {
    const result = buildProgress({ phase: 'signature', processed: 10, total: 20, rate: 1.5 });
    assert.equal(result.phase, 'signature');
    assert.equal(result.processed, 10);
    assert.equal(result.total, 20);
    assert.equal(result.rate, 1.5);
  });

  it('should compute report interval for small totals', () => {
    assert.equal(getReportEvery(5), 1);
  });

  it('should compute report interval for large totals', () => {
    assert.equal(getReportEvery(7212), 360);
  });
});
