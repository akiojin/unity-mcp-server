import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fsSync from 'node:fs';

const ENV_KEYS = [
  'UNITY_PROJECT_ROOT',
  'UNITY_MCP_MCP_HOST',
  'UNITY_MCP_UNITY_HOST',
  'UNITY_MCP_PORT',
  'UNITY_MCP_LOG_LEVEL',
  'UNITY_MCP_VERSION_MISMATCH',
  'UNITY_MCP_HTTP_ENABLED',
  'UNITY_MCP_HTTP_PORT',
  'UNITY_MCP_TELEMETRY_ENABLED',
  'UNITY_MCP_LSP_REQUEST_TIMEOUT_MS'
];

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

describe('Config', () => {
  let envSnapshot;

  beforeEach(() => {
    envSnapshot = snapshotEnv();
    // Ensure tests start from a clean env baseline
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
  });

  it('should have correct default Unity settings', async () => {
    const { config } = await importConfigFresh();
    const dockerDefault = fsSync.existsSync('/.dockerenv') ? 'host.docker.internal' : 'localhost';

    assert.equal(config.unity.unityHost, 'localhost');
    assert.equal(config.unity.mcpHost, dockerDefault);
    assert.equal(config.unity.bindHost, 'localhost');
    assert.equal(config.unity.port, 6400);
    assert.equal(config.unity.reconnectDelay, 1000);
    assert.equal(config.unity.maxReconnectDelay, 30000);
    assert.equal(config.unity.reconnectBackoffMultiplier, 2);
    assert.equal(config.unity.commandTimeout, 30000);
  });

  it('should have correct server settings', async () => {
    const { config } = await importConfigFresh();

    assert.equal(config.server.name, 'unity-mcp-server');
    const pkgVersion = JSON.parse(
      fsSync.readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')
    ).version;
    assert.equal(config.server.version, pkgVersion);
    assert.equal(config.server.description, 'MCP server for Unity Editor integration');
  });

  it('should have correct logging settings', async () => {
    const { config } = await importConfigFresh();

    assert.equal(config.logging.level, 'info');
    assert.equal(config.logging.prefix, '[unity-mcp-server]');
  });

  it('should have correct compat settings', async () => {
    const { config } = await importConfigFresh();

    assert.equal(config.compat.versionMismatch, 'warn');
  });

  it('should load version mismatch policy from environment variables', async () => {
    process.env.UNITY_MCP_VERSION_MISMATCH = 'error';
    let { config } = await importConfigFresh();
    assert.equal(config.compat.versionMismatch, 'error');

    process.env.UNITY_MCP_VERSION_MISMATCH = 'warning';
    ({ config } = await importConfigFresh());
    assert.equal(config.compat.versionMismatch, 'warn');

    process.env.UNITY_MCP_VERSION_MISMATCH = 'ignore';
    ({ config } = await importConfigFresh());
    assert.equal(config.compat.versionMismatch, 'off');
  });

  it('should normalize invalid version mismatch policy to default', async () => {
    process.env.UNITY_MCP_VERSION_MISMATCH = 'nope';

    const { config } = await importConfigFresh();

    assert.equal(config.compat.versionMismatch, 'warn');
  });

  it('should load unity host/port from environment variables', async () => {
    process.env.UNITY_MCP_UNITY_HOST = '127.0.0.1';
    process.env.UNITY_MCP_MCP_HOST = 'host.docker.internal';
    process.env.UNITY_MCP_PORT = '6410';

    const { config } = await importConfigFresh();

    assert.equal(config.unity.unityHost, '127.0.0.1');
    assert.equal(config.unity.mcpHost, 'host.docker.internal');
    assert.equal(config.unity.bindHost, '127.0.0.1');
    assert.equal(config.unity.port, 6410);
  });

  it('should validate invalid ports and fall back to defaults', async () => {
    process.env.UNITY_MCP_PORT = '99999';
    process.env.UNITY_MCP_HTTP_PORT = '-1';

    const { config } = await importConfigFresh();

    assert.equal(config.unity.port, 6400);
    assert.equal(config.http.port, 6401);
  });

  it('should load http and telemetry settings from environment variables', async () => {
    process.env.UNITY_MCP_HTTP_ENABLED = 'true';
    process.env.UNITY_MCP_HTTP_PORT = '6405';
    process.env.UNITY_MCP_TELEMETRY_ENABLED = 'true';

    const { config } = await importConfigFresh();

    assert.equal(config.http.enabled, true);
    assert.equal(config.http.port, 6405);
    assert.equal(config.telemetry.enabled, true);
  });
});

describe('logger', () => {
  let originalConsoleLog;
  let originalConsoleError;
  let logOutput;
  let errorOutput;
  let envSnapshot;
  let logger;

  beforeEach(async () => {
    envSnapshot = snapshotEnv();
    for (const k of ENV_KEYS) delete process.env[k];

    ({ logger } = await importConfigFresh());

    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    logOutput = [];
    errorOutput = [];

    console.log = (...args) => logOutput.push(args.join(' '));
    console.error = (...args) => errorOutput.push(args.join(' '));
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    logOutput = [];
    errorOutput = [];
    restoreEnv(envSnapshot);
  });

  it('should log info messages', () => {
    logger.info('Test info message');
    assert.equal(errorOutput.length, 1);
    assert.match(errorOutput[0], /\[unity-mcp-server\] Test info message/);
  });

  it('should log error messages', () => {
    logger.error('Test error message');
    assert.equal(errorOutput.length, 1);
    assert.match(errorOutput[0], /\[unity-mcp-server\] ERROR: Test error message/);
  });

  it('should log error with error object', () => {
    const error = new Error('Test error');
    logger.error('Something failed', error);
    assert.equal(errorOutput.length, 1);
    assert.match(errorOutput[0], /Something failed/);
  });

  it('should not log debug messages when level is info', () => {
    logger.debug('Debug message');
    assert.equal(logOutput.length, 0);
    assert.equal(errorOutput.length, 0);
  });

  it('should log debug messages when level is debug', () => {
    logger.setLevel('debug');

    logger.debug('Debug message');
    assert.equal(errorOutput.length, 1);
    assert.match(errorOutput[0], /\[unity-mcp-server\] DEBUG: Debug message/);

    logger.setLevel('info');
  });

  it('should log warning messages when level is info', () => {
    logger.warning('Warning message');
    assert.equal(errorOutput.length, 1);
    assert.match(errorOutput[0], /\[unity-mcp-server\] WARNING: Warning message/);
  });

  it('should log warning messages when level is warning', () => {
    logger.setLevel('warning');

    logger.warning('Warning message');
    assert.equal(errorOutput.length, 1);
    assert.match(errorOutput[0], /\[unity-mcp-server\] WARNING: Warning message/);

    logger.setLevel('info');
  });
});
