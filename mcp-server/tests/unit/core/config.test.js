import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { config, logger } from '../../../src/core/config.js';

describe('Config', () => {
  describe('config object', () => {
    it('should have correct default Unity settings', () => {
      assert.equal(config.unity.host, 'localhost');
      assert.equal(config.unity.port, 6400);
      assert.equal(config.unity.reconnectDelay, 1000);
      assert.equal(config.unity.maxReconnectDelay, 30000);
      assert.equal(config.unity.reconnectBackoffMultiplier, 2);
      assert.equal(config.unity.commandTimeout, 30000);
    });

    it('should have correct server settings', () => {
      assert.equal(config.server.name, 'unity-editor-mcp-server');
      assert.equal(config.server.version, '0.1.0');
      assert.equal(config.server.description, 'MCP server for Unity Editor integration');
    });

    it('should have correct logging settings', () => {
      assert.equal(config.logging.level, 'info');
      assert.equal(config.logging.prefix, '[Unity Editor MCP]');
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
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      assert.equal(logOutput.length, 1);
      assert.match(logOutput[0], /\[Unity Editor MCP\] Test info message/);
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
    });
  });
});