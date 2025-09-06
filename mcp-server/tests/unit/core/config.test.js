import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { config, logger } from '../../../src/core/config.js';

describe('Config', () => {
  describe('config object', () => {
    it('should have correct default Unity settings', () => {
      assert.ok(config.unity.host); // Should have a host value (localhost or host.docker.internal)
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
