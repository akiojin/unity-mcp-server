/**
 * MCPLogger unit tests
 *
 * Tests for MCP SDK-compliant logging functionality
 * RFC 5424 log levels: emergency, alert, critical, error, warning, notice, info, debug
 */

import assert from 'node:assert';
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import { MCPLogger, LOG_LEVELS } from '../../../src/core/mcpLogger.js';

describe('MCPLogger', () => {
  let originalConsoleError;
  let consoleOutput;

  beforeEach(() => {
    // Capture console.error output
    originalConsoleError = console.error;
    consoleOutput = [];
    console.error = (...args) => {
      consoleOutput.push(args);
    };
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('LOG_LEVELS', () => {
    // REQ-1: RFC 5424準拠の8段階ログレベルをサポート
    it('should define all 8 RFC 5424 log levels', () => {
      assert.strictEqual(LOG_LEVELS.emergency, 0);
      assert.strictEqual(LOG_LEVELS.alert, 1);
      assert.strictEqual(LOG_LEVELS.critical, 2);
      assert.strictEqual(LOG_LEVELS.error, 3);
      assert.strictEqual(LOG_LEVELS.warning, 4);
      assert.strictEqual(LOG_LEVELS.notice, 5);
      assert.strictEqual(LOG_LEVELS.info, 6);
      assert.strictEqual(LOG_LEVELS.debug, 7);
    });

    it('should have exactly 8 levels', () => {
      assert.strictEqual(Object.keys(LOG_LEVELS).length, 8);
    });
  });

  describe('constructor', () => {
    it('should use default prefix when not provided', () => {
      const logger = new MCPLogger({});
      assert.strictEqual(logger.prefix, '[unity-mcp-server]');
    });

    it('should use custom prefix when provided', () => {
      const logger = new MCPLogger({ logging: { prefix: '[custom]' } });
      assert.strictEqual(logger.prefix, '[custom]');
    });

    it('should use default log level (info) when not provided', () => {
      const logger = new MCPLogger({});
      assert.strictEqual(logger.minLevel, LOG_LEVELS.info);
    });

    it('should use custom log level when provided', () => {
      const logger = new MCPLogger({ logging: { level: 'debug' } });
      assert.strictEqual(logger.minLevel, LOG_LEVELS.debug);
    });

    it('should start with server and transportConnected as null/false', () => {
      const logger = new MCPLogger({});
      assert.strictEqual(logger.server, null);
      assert.strictEqual(logger.transportConnected, false);
    });
  });

  describe('setServer', () => {
    it('should set server instance and mark transport as connected', () => {
      const logger = new MCPLogger({});
      const mockServer = { sendLoggingMessage: () => {} };

      logger.setServer(mockServer);

      assert.strictEqual(logger.server, mockServer);
      assert.strictEqual(logger.transportConnected, true);
    });
  });

  describe('setLevel', () => {
    it('should change log level to valid level', () => {
      const logger = new MCPLogger({});
      logger.setLevel('debug');
      assert.strictEqual(logger.minLevel, LOG_LEVELS.debug);

      logger.setLevel('error');
      assert.strictEqual(logger.minLevel, LOG_LEVELS.error);
    });

    it('should ignore invalid log level', () => {
      const logger = new MCPLogger({ logging: { level: 'info' } });
      logger.setLevel('invalid');
      assert.strictEqual(logger.minLevel, LOG_LEVELS.info);
    });
  });

  describe('log level filtering (REQ-2)', () => {
    it('should output logs at or below minLevel', () => {
      const logger = new MCPLogger({ logging: { level: 'warning' } });

      logger.emergency('test');
      logger.alert('test');
      logger.critical('test');
      logger.error('test');
      logger.warning('test');

      assert.strictEqual(consoleOutput.length, 5);
    });

    it('should filter logs above minLevel', () => {
      const logger = new MCPLogger({ logging: { level: 'warning' } });

      logger.notice('test');
      logger.info('test');
      logger.debug('test');

      assert.strictEqual(consoleOutput.length, 0);
    });

    it('should output all levels when minLevel is debug', () => {
      const logger = new MCPLogger({ logging: { level: 'debug' } });

      logger.emergency('test');
      logger.alert('test');
      logger.critical('test');
      logger.error('test');
      logger.warning('test');
      logger.notice('test');
      logger.info('test');
      logger.debug('test');

      assert.strictEqual(consoleOutput.length, 8);
    });
  });

  describe('stderr output (REQ-3)', () => {
    it('should always output to stderr via console.error', () => {
      const logger = new MCPLogger({});
      logger.info('test message');

      assert.strictEqual(consoleOutput.length, 1);
    });

    it('should format message with prefix', () => {
      const logger = new MCPLogger({ logging: { prefix: '[test]' } });
      logger.info('hello world');

      assert.ok(consoleOutput[0][0].includes('[test]'));
      assert.ok(consoleOutput[0][0].includes('hello world'));
    });

    it('should include level label for non-info levels', () => {
      // Set debug level to ensure all logs are output
      const logger = new MCPLogger({ logging: { level: 'debug' } });

      logger.error('error msg');
      logger.warning('warning msg');
      logger.debug('debug msg');

      // error, warning, debug should have level labels
      assert.ok(consoleOutput[0][0].includes('ERROR:'));
      assert.ok(consoleOutput[1][0].includes('WARNING:'));
      assert.ok(consoleOutput[2][0].includes('DEBUG:'));
    });

    it('should not include level label for info level', () => {
      const logger = new MCPLogger({});
      logger.info('info msg');

      assert.ok(!consoleOutput[0][0].includes('INFO:'));
    });

    it('should pass additional arguments to console.error', () => {
      const logger = new MCPLogger({});
      const extraData = { key: 'value' };
      logger.info('message', extraData);

      assert.strictEqual(consoleOutput[0].length, 2);
      assert.deepStrictEqual(consoleOutput[0][1], extraData);
    });
  });

  describe('MCP notification (REQ-4)', () => {
    it('should not send MCP notification when transport is not connected', () => {
      const logger = new MCPLogger({});
      let notificationSent = false;

      // Server is not set, so no notification should be sent
      logger.info('test');

      assert.strictEqual(notificationSent, false);
    });

    it('should send MCP notification when transport is connected', () => {
      const logger = new MCPLogger({});
      let notificationParams = null;
      const mockServer = {
        sendLoggingMessage: params => {
          notificationParams = params;
        }
      };

      logger.setServer(mockServer);
      logger.info('test message');

      assert.ok(notificationParams);
      assert.strictEqual(notificationParams.level, 'info');
      assert.strictEqual(notificationParams.logger, 'unity-mcp-server');
    });
  });

  describe('MCP notification data format (REQ-5)', () => {
    it('should send message as string in data field', () => {
      const logger = new MCPLogger({});
      let notificationParams = null;
      const mockServer = {
        sendLoggingMessage: params => {
          notificationParams = params;
        }
      };

      logger.setServer(mockServer);
      logger.info('simple message');

      assert.strictEqual(typeof notificationParams.data, 'string');
      assert.strictEqual(notificationParams.data, 'simple message');
    });

    it('should concatenate additional arguments into data string', () => {
      const logger = new MCPLogger({});
      let notificationParams = null;
      const mockServer = {
        sendLoggingMessage: params => {
          notificationParams = params;
        }
      };

      logger.setServer(mockServer);
      logger.info('message', 'arg1', { key: 'value' });

      assert.strictEqual(typeof notificationParams.data, 'string');
      assert.ok(notificationParams.data.includes('message'));
      assert.ok(notificationParams.data.includes('arg1'));
      assert.ok(notificationParams.data.includes('key'));
    });
  });

  describe('error resilience (REQ-8)', () => {
    it('should continue stderr output even when MCP notification fails', () => {
      const logger = new MCPLogger({});
      const mockServer = {
        sendLoggingMessage: () => {
          throw new Error('MCP notification failed');
        }
      };

      logger.setServer(mockServer);

      // Should not throw
      assert.doesNotThrow(() => {
        logger.info('test message');
      });

      // stderr output should still happen (message + error notification)
      assert.ok(consoleOutput.length >= 1);
    });

    it('should log MCP notification failure to stderr', () => {
      const logger = new MCPLogger({});
      const mockServer = {
        sendLoggingMessage: () => {
          throw new Error('Network error');
        }
      };

      logger.setServer(mockServer);
      logger.info('test');

      // Check that error was logged
      const hasErrorLog = consoleOutput.some(output =>
        output[0].includes('MCP notification failed')
      );
      assert.ok(hasErrorLog);
    });
  });

  describe('public methods', () => {
    it('should have all 8 log level methods', () => {
      const logger = new MCPLogger({});

      assert.strictEqual(typeof logger.emergency, 'function');
      assert.strictEqual(typeof logger.alert, 'function');
      assert.strictEqual(typeof logger.critical, 'function');
      assert.strictEqual(typeof logger.error, 'function');
      assert.strictEqual(typeof logger.warning, 'function');
      assert.strictEqual(typeof logger.notice, 'function');
      assert.strictEqual(typeof logger.info, 'function');
      assert.strictEqual(typeof logger.debug, 'function');
    });

    it('should send correct level in MCP notification for each method', () => {
      const logger = new MCPLogger({ logging: { level: 'debug' } });
      const notifications = [];
      const mockServer = {
        sendLoggingMessage: params => {
          notifications.push(params);
        }
      };

      logger.setServer(mockServer);

      logger.emergency('test');
      logger.alert('test');
      logger.critical('test');
      logger.error('test');
      logger.warning('test');
      logger.notice('test');
      logger.info('test');
      logger.debug('test');

      assert.strictEqual(notifications[0].level, 'emergency');
      assert.strictEqual(notifications[1].level, 'alert');
      assert.strictEqual(notifications[2].level, 'critical');
      assert.strictEqual(notifications[3].level, 'error');
      assert.strictEqual(notifications[4].level, 'warning');
      assert.strictEqual(notifications[5].level, 'notice');
      assert.strictEqual(notifications[6].level, 'info');
      assert.strictEqual(notifications[7].level, 'debug');
    });
  });
});
