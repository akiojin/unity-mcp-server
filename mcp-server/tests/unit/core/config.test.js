import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { config, logger } from '../../../src/core/config.js';

describe('Config', () => {
  describe('config object', () => {
    it('should have correct default Unity settings', () => {
      assert.ok(config.unity.unityHost);
      assert.ok(config.unity.mcpHost);
      assert.equal(config.unity.bindHost, config.unity.unityHost);
      assert.equal(config.unity.port, 6400);
      assert.equal(config.unity.reconnectDelay, 1000);
      assert.equal(config.unity.maxReconnectDelay, 30000);
      assert.equal(config.unity.reconnectBackoffMultiplier, 2);
      assert.equal(config.unity.commandTimeout, 30000);
    });

    it('should have correct server settings', () => {
      assert.equal(config.server.name, 'unity-mcp-server');
      assert.equal(config.server.version, '0.1.0');
      assert.equal(config.server.description, 'MCP server for Unity Editor integration');
    });

    it('should have correct logging settings', () => {
      assert.equal(config.logging.level, 'info');
      assert.equal(config.logging.prefix, '[Unity Editor MCP]');
    });

    it('should load mcpHost and unityHost from external config', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unity-mcp-config-'));
      const configPath = path.join(tmpDir, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        unity: {
          unityHost: '127.0.0.1',
          mcpHost: 'host.docker.internal',
          bindHost: '0.0.0.0',
          port: 6410
        }
      }), 'utf8');

      const prevConfigPath = process.env.UNITY_MCP_CONFIG;
      const prevHost = process.env.UNITY_HOST;
      const prevClientHost = process.env.UNITY_CLIENT_HOST;
      const prevBindHost = process.env.UNITY_BIND_HOST;
      const prevUnityHost = process.env.UNITY_UNITY_HOST;
      const prevMcpHost = process.env.UNITY_MCP_HOST;

      process.env.UNITY_MCP_CONFIG = configPath;
      delete process.env.UNITY_HOST;
      delete process.env.UNITY_CLIENT_HOST;
      delete process.env.UNITY_BIND_HOST;
      delete process.env.UNITY_UNITY_HOST;
      delete process.env.UNITY_MCP_HOST;

      try {
        const moduleUrl = new URL('../../../src/core/config.js', import.meta.url);
        moduleUrl.searchParams.set('ts', Date.now().toString());
        const { config: customConfig } = await import(moduleUrl.href);

        assert.equal(customConfig.__configPath, configPath);
        assert.equal(customConfig.unity.unityHost, '127.0.0.1');
        assert.equal(customConfig.unity.mcpHost, 'host.docker.internal');
        assert.equal(customConfig.unity.bindHost, '0.0.0.0');
        assert.equal(customConfig.unity.port, 6410);
      } finally {
        if (prevConfigPath === undefined) {
          delete process.env.UNITY_MCP_CONFIG;
        } else {
          process.env.UNITY_MCP_CONFIG = prevConfigPath;
        }

        if (prevHost === undefined) {
          delete process.env.UNITY_HOST;
        } else {
          process.env.UNITY_HOST = prevHost;
        }

        if (prevClientHost === undefined) {
          delete process.env.UNITY_CLIENT_HOST;
        } else {
          process.env.UNITY_CLIENT_HOST = prevClientHost;
        }

        if (prevBindHost === undefined) {
          delete process.env.UNITY_BIND_HOST;
        } else {
          process.env.UNITY_BIND_HOST = prevBindHost;
        }

        if (prevUnityHost === undefined) {
          delete process.env.UNITY_UNITY_HOST;
        } else {
          process.env.UNITY_UNITY_HOST = prevUnityHost;
        }

        if (prevMcpHost === undefined) {
          delete process.env.UNITY_MCP_HOST;
        } else {
          process.env.UNITY_MCP_HOST = prevMcpHost;
        }

        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should fall back to unityHost when only legacy host is provided', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unity-mcp-config-'));
      const configPath = path.join(tmpDir, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({ unity: { host: 'example.local' } }), 'utf8');

      const prevConfigPath = process.env.UNITY_MCP_CONFIG;
      const prevHost = process.env.UNITY_HOST;
      const prevClientHost = process.env.UNITY_CLIENT_HOST;
      const prevUnityHost = process.env.UNITY_UNITY_HOST;
      const prevMcpHost = process.env.UNITY_MCP_HOST;

      process.env.UNITY_MCP_CONFIG = configPath;
      delete process.env.UNITY_HOST;
      delete process.env.UNITY_CLIENT_HOST;
      delete process.env.UNITY_UNITY_HOST;
      delete process.env.UNITY_MCP_HOST;

      try {
        const moduleUrl = new URL('../../../src/core/config.js', import.meta.url);
        moduleUrl.searchParams.set('ts', Date.now().toString());
        const { config: fallbackConfig } = await import(moduleUrl.href);

        assert.equal(fallbackConfig.unity.unityHost, 'example.local');
        assert.equal(fallbackConfig.unity.mcpHost, 'example.local');
        assert.equal(fallbackConfig.unity.bindHost, 'example.local');
      } finally {
        if (prevConfigPath === undefined) {
          delete process.env.UNITY_MCP_CONFIG;
        } else {
          process.env.UNITY_MCP_CONFIG = prevConfigPath;
        }

        if (prevHost === undefined) {
          delete process.env.UNITY_HOST;
        } else {
          process.env.UNITY_HOST = prevHost;
        }

        if (prevClientHost === undefined) {
          delete process.env.UNITY_CLIENT_HOST;
        } else {
          process.env.UNITY_CLIENT_HOST = prevClientHost;
        }

        if (prevUnityHost === undefined) {
          delete process.env.UNITY_UNITY_HOST;
        } else {
          process.env.UNITY_UNITY_HOST = prevUnityHost;
        }

        if (prevMcpHost === undefined) {
          delete process.env.UNITY_MCP_HOST;
        } else {
          process.env.UNITY_MCP_HOST = prevMcpHost;
        }

        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should map legacy clientHost/bindHost to new fields', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unity-mcp-config-'));
      const configPath = path.join(tmpDir, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        unity: {
          clientHost: 'legacy-client',
          bindHost: 'legacy-bind'
        }
      }), 'utf8');

      const prevConfigPath = process.env.UNITY_MCP_CONFIG;
      const prevHost = process.env.UNITY_HOST;
      const prevClientHost = process.env.UNITY_CLIENT_HOST;
      const prevUnityHost = process.env.UNITY_UNITY_HOST;
      const prevMcpHost = process.env.UNITY_MCP_HOST;
      const prevBindHost = process.env.UNITY_BIND_HOST;
      process.env.UNITY_MCP_CONFIG = configPath;
      delete process.env.UNITY_HOST;
      delete process.env.UNITY_CLIENT_HOST;
      delete process.env.UNITY_UNITY_HOST;
      delete process.env.UNITY_MCP_HOST;
      delete process.env.UNITY_BIND_HOST;

      try {
        const moduleUrl = new URL('../../../src/core/config.js', import.meta.url);
        moduleUrl.searchParams.set('ts', Date.now().toString());
        const { config: legacyConfig } = await import(moduleUrl.href);

        assert.equal(legacyConfig.unity.mcpHost, 'legacy-client');
        assert.equal(legacyConfig.unity.unityHost, 'legacy-bind');
        assert.equal(legacyConfig.unity.bindHost, 'legacy-bind');
      } finally {
        if (prevConfigPath === undefined) {
          delete process.env.UNITY_MCP_CONFIG;
        } else {
          process.env.UNITY_MCP_CONFIG = prevConfigPath;
        }

        if (prevHost === undefined) {
          delete process.env.UNITY_HOST;
        } else {
          process.env.UNITY_HOST = prevHost;
        }

        if (prevClientHost === undefined) {
          delete process.env.UNITY_CLIENT_HOST;
        } else {
          process.env.UNITY_CLIENT_HOST = prevClientHost;
        }

        if (prevUnityHost === undefined) {
          delete process.env.UNITY_UNITY_HOST;
        } else {
          process.env.UNITY_UNITY_HOST = prevUnityHost;
        }

        if (prevMcpHost === undefined) {
          delete process.env.UNITY_MCP_HOST;
        } else {
          process.env.UNITY_MCP_HOST = prevMcpHost;
        }

        if (prevBindHost === undefined) {
          delete process.env.UNITY_BIND_HOST;
        } else {
          process.env.UNITY_BIND_HOST = prevBindHost;
        }

        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should create default config when none exists', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unity-mcp-default-'));
      const prevCwd = process.cwd();
      const prevConfigPath = process.env.UNITY_MCP_CONFIG;
      delete process.env.UNITY_MCP_CONFIG;

      try {
        process.chdir(tmpDir);
        const moduleUrl = new URL('../../../src/core/config.js', import.meta.url);
        moduleUrl.searchParams.set('ts', Date.now().toString());
        const { config: generatedConfig } = await import(moduleUrl.href);

        const defaultPath = path.join(tmpDir, '.unity', 'config.json');
        const stat = await fs.stat(defaultPath);
        assert.ok(stat.isFile());

        const contents = JSON.parse(await fs.readFile(defaultPath, 'utf8'));
        assert.equal(contents.unity.unityHost, 'localhost');
        assert.equal(contents.unity.mcpHost, 'localhost');
        assert.equal(contents.unity.port, 6400);

        assert.equal(generatedConfig.unity.unityHost, 'localhost');
        assert.equal(generatedConfig.unity.mcpHost, 'localhost');
        assert.equal(generatedConfig.unity.port, 6400);
        assert.equal(generatedConfig.__configPath, defaultPath);
        assert.equal(generatedConfig.__configGenerated, true);
      } finally {
        if (prevConfigPath === undefined) {
          delete process.env.UNITY_MCP_CONFIG;
        } else {
          process.env.UNITY_MCP_CONFIG = prevConfigPath;
        }
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
      assert.match(errorOutput[0], /\[Unity Editor MCP\] Test info message/);
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      assert.equal(errorOutput.length, 1);
      assert.match(errorOutput[0], /\[Unity Editor MCP\] ERROR: Test error message/);
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
      // Temporarily change log level
      const originalLevel = config.logging.level;
      config.logging.level = 'debug';
      
      logger.debug('Debug message');
      assert.equal(errorOutput.length, 1);
      assert.match(errorOutput[0], /\[Unity Editor MCP\] DEBUG: Debug message/);
      
      // Restore original level
      config.logging.level = originalLevel;
    });

    it('should log warn messages when level is info', () => {
      logger.warn('Warning message');
      assert.equal(errorOutput.length, 1);
      assert.match(errorOutput[0], /\[Unity Editor MCP\] WARN: Warning message/);
    });

    it('should log warn messages when level is warn', () => {
      // Temporarily change log level
      const originalLevel = config.logging.level;
      config.logging.level = 'warn';
      
      logger.warn('Warning message');
      assert.equal(errorOutput.length, 1);
      assert.match(errorOutput[0], /\[Unity Editor MCP\] WARN: Warning message/);
      
      // Restore original level
      config.logging.level = originalLevel;
    });

    it('should not log info messages when level is warn', () => {
      // Temporarily change log level
      const originalLevel = config.logging.level;
      config.logging.level = 'warn';
      
      logger.info('Info message');
      assert.equal(errorOutput.length, 0);
      
      // Restore original level
      config.logging.level = originalLevel;
    });

    it('should handle multiple arguments in logger methods', () => {
      logger.info('Message', { key: 'value' }, 123);
      assert.equal(errorOutput.length, 1);
      assert.match(errorOutput[0], /\[Unity Editor MCP\] Message/);
      // Note: The logger uses console.error(...args) which joins them with spaces
      // So the output will contain the stringified object and number
      assert(errorOutput[0].includes('[object Object]') || errorOutput[0].includes('value'));
      assert(errorOutput[0].includes('123'));
    });

    it('should always log error messages regardless of level', () => {
      // Test with different log levels
      const originalLevel = config.logging.level;
      
      config.logging.level = 'debug';
      logger.error('Error message 1');
      assert.equal(errorOutput.length, 1);
      
      errorOutput.length = 0; // Clear
      config.logging.level = 'warn';
      logger.error('Error message 2');
      assert.equal(errorOutput.length, 1);
      
      // Restore original level
      config.logging.level = originalLevel;
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
