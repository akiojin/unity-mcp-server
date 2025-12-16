import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const ENV_KEYS = ['UNITY_MCP_TELEMETRY_ENABLED'];

function snapshotEnv() {
  const out = {};
  for (const k of ENV_KEYS) out[k] = process.env[k];
  return out;
}

function restoreEnv(snapshot) {
  for (const k of ENV_KEYS) {
    const v = snapshot[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

async function importConfigFresh() {
  const moduleUrl = new URL('../../../src/core/config.js', import.meta.url);
  moduleUrl.searchParams.set('ts', Date.now().toString());
  return import(moduleUrl.href);
}

describe('telemetry config', () => {
  let envSnapshot;

  beforeEach(() => {
    envSnapshot = snapshotEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
  });

  it('is disabled by default', async () => {
    const { config } = await importConfigFresh();
    assert.equal(config.telemetry.enabled, false);
  });

  it('can be enabled via environment variables', async () => {
    process.env.UNITY_MCP_TELEMETRY_ENABLED = 'true';
    const { config } = await importConfigFresh();
    assert.equal(config.telemetry.enabled, true);
  });
});
