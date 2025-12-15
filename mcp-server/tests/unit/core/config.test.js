import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config, logger } from '../../../src/core/config.js';

describe('Config', () => {
  describe('config object', () => {
    it('should have correct default Unity settings', () => {
      assert.ok(config.unity.unityHost);
      assert.ok(config.unity.mcpHost);
      assert.equal(config.unity.bindHost, config.unity.unityHost);
      assert.equal(typeof config.unity.port, 'number');
      assert.ok(config.unity.port > 0);
      assert.equal(config.unity.reconnectDelay, 1000);
      assert.equal(config.unity.maxReconnectDelay, 30000);
      assert.equal(config.unity.reconnectBackoffMultiplier, 2);
      assert.equal(config.unity.commandTimeout, 30000);
    });

    it('should have correct server settings', () => {
      assert.equal(config.server.name, 'unity-mcp-server');
      const pkgVersion = JSON.parse(
        fsSync.readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')
      ).version;
      assert.equal(config.server.version, pkgVersion);
      assert.equal(config.server.description, 'MCP server for Unity Editor integration');
    });

    it('should have correct logging settings', () => {
      assert.equal(config.logging.level, 'info');
      assert.equal(config.logging.prefix, '[unity-mcp-server]');
    });

    it('should load mcpHost and unityHost from external config', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unity-mcp-config-'));
      const unityDir = path.join(tmpDir, '.unity');
      await fs.mkdir(unityDir, { recursive: true });
      const configPath = path.join(unityDir, 'config.json');
      await fs.writeFile(
        configPath,
        JSON.stringify({
          unity: {
            unityHost: '127.0.0.1',
            mcpHost: 'host.docker.internal',
            bindHost: '0.0.0.0',
            port: 6410
          }
        }),
        'utf8'
      );

      const prevCwd = process.cwd();
      try {
        process.chdir(tmpDir);
        const moduleUrl = new URL('../../../src/core/config.js', import.meta.url);
        moduleUrl.searchParams.set('ts', Date.now().toString());
        const { config: customConfig } = await import(moduleUrl.href);

        assert.equal(customConfig.__configPath, configPath);
        assert.equal(customConfig.unity.unityHost, '127.0.0.1');
        assert.equal(customConfig.unity.mcpHost, 'host.docker.internal');
        assert.equal(customConfig.unity.bindHost, '0.0.0.0');
        assert.equal(customConfig.unity.port, 6410);
      } finally {
        process.chdir(prevCwd);
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should fall back to unityHost when only legacy host is provided', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unity-mcp-config-'));
      const unityDir = path.join(tmpDir, '.unity');
      await fs.mkdir(unityDir, { recursive: true });
      const configPath = path.join(unityDir, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({ unity: { host: 'example.local' } }), 'utf8');

      const prevCwd = process.cwd();
      try {
        process.chdir(tmpDir);
        const moduleUrl = new URL('../../../src/core/config.js', import.meta.url);
        moduleUrl.searchParams.set('ts', Date.now().toString());
        const { config: fallbackConfig } = await import(moduleUrl.href);

        assert.equal(fallbackConfig.unity.unityHost, 'example.local');
        assert.equal(fallbackConfig.unity.mcpHost, 'example.local');
        assert.equal(fallbackConfig.unity.bindHost, 'example.local');
      } finally {
        process.chdir(prevCwd);
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should map legacy clientHost/bindHost to new fields', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unity-mcp-config-'));
      const unityDir = path.join(tmpDir, '.unity');
      await fs.mkdir(unityDir, { recursive: true });
      const configPath = path.join(unityDir, 'config.json');
      await fs.writeFile(
        configPath,
        JSON.stringify({
          unity: {
            clientHost: 'legacy-client',
            bindHost: 'legacy-bind'
          }
        }),
        'utf8'
      );

      const prevCwd = process.cwd();
      try {
        process.chdir(tmpDir);
        const moduleUrl = new URL('../../../src/core/config.js', import.meta.url);
        moduleUrl.searchParams.set('ts', Date.now().toString());
        const { config: legacyConfig } = await import(moduleUrl.href);

        assert.equal(legacyConfig.unity.mcpHost, 'legacy-client');
        assert.equal(legacyConfig.unity.unityHost, 'legacy-bind');
        assert.equal(legacyConfig.unity.bindHost, 'legacy-bind');
      } finally {
        process.chdir(prevCwd);
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should use defaults when no config exists', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unity-mcp-default-'));
      const prevCwd = process.cwd();
      try {
        process.chdir(tmpDir);
        const moduleUrl = new URL('../../../src/core/config.js', import.meta.url);
        moduleUrl.searchParams.set('ts', Date.now().toString());
        const { config: generatedConfig } = await import(moduleUrl.href);

        const defaultPath = path.join(tmpDir, '.unity', 'config.json');
        assert.equal(fsSync.existsSync(defaultPath), false);

        assert.equal(generatedConfig.__configPath, undefined);
        assert.equal(generatedConfig.unity.unityHost, 'localhost');
        assert.equal(generatedConfig.unity.mcpHost, 'localhost');
        assert.equal(generatedConfig.unity.port, 6400);
      } finally {
        process.chdir(prevCwd);
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('logger', () => {
    let originalConsoleLog;
    let originalConsoleError;
    let logOutput;
    let errorOutput;

    beforeEach(() => {
      originalConsoleLog = console.log;
      originalConsoleError = console.error;
      logOutput = [];
      errorOutput = [];

      console.log = (...args) => logOutput.push(args.join(' '));
      console.error = (...args) => errorOutput.push(args.join(' '));
      logger.setLevel('info');
    });

    afterEach(() => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      logOutput = [];
      errorOutput = [];
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
      // Use setLevel to dynamically change log level
      logger.setLevel('debug');

      logger.debug('Debug message');
      assert.equal(errorOutput.length, 1);
      assert.match(errorOutput[0], /\[unity-mcp-server\] DEBUG: Debug message/);

      // Restore original level
      logger.setLevel('info');
    });

    it('should log warning messages when level is info', () => {
      logger.warning('Warning message');
      assert.equal(errorOutput.length, 1);
      assert.match(errorOutput[0], /\[unity-mcp-server\] WARNING: Warning message/);
    });

    it('should log warning messages when level is warning', () => {
      // Use setLevel to dynamically change log level
      logger.setLevel('warning');

      logger.warning('Warning message');
      assert.equal(errorOutput.length, 1);
      assert.match(errorOutput[0], /\[unity-mcp-server\] WARNING: Warning message/);

      // Restore original level
      logger.setLevel('info');
    });

    it('should not log info messages when level is warning', () => {
      // Use setLevel to dynamically change log level
      logger.setLevel('warning');

      logger.info('Info message');
      assert.equal(errorOutput.length, 0);

      // Restore original level
      logger.setLevel('info');
    });

    it('should handle multiple arguments in logger methods', () => {
      logger.info('Message', { key: 'value' }, 123);
      assert.equal(errorOutput.length, 1);
      assert.match(errorOutput[0], /\[unity-mcp-server\] Message/);
      // Note: The logger uses console.error(...args) which joins them with spaces
      // So the output will contain the stringified object and number
      assert(errorOutput[0].includes('[object Object]') || errorOutput[0].includes('value'));
      assert(errorOutput[0].includes('123'));
    });

    it('should always log error messages regardless of level', () => {
      // Test with different log levels using setLevel
      logger.setLevel('debug');
      logger.error('Error message 1');
      assert.equal(errorOutput.length, 1);

      errorOutput.length = 0; // Clear
      logger.setLevel('warning');
      logger.error('Error message 2');
      assert.equal(errorOutput.length, 1);

      // Restore original level
      logger.setLevel('info');
    });

    it('should handle error objects in logger.error', () => {
      const error = new Error('Test error');
      error.stack = 'Stack trace here';

      logger.error('Operation failed', error);
      assert.equal(errorOutput.length, 1);
      assert.match(errorOutput[0], /Operation failed/);
    });
  });
});
