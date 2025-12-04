import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../../../src/core/config.js';

describe('telemetry config', () => {
  it('is disabled by default', () => {
    assert.equal(config.telemetry.enabled, false);
  });
});
