import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ReadConsoleToolHandler } from '../../../../src/handlers/console/ReadConsoleToolHandler.js';

describe('ReadConsoleToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async () => ({
        success: true,
        logs: [
          {
            message: 'Test log message',
            stackTrace: 'at TestClass.TestMethod()',
            logType: 'Log',
            timestamp: '2025-01-24T10:00:00Z',
            file: 'TestScript.cs',
            line: 42
          },
          {
            message: 'Warning message',
            stackTrace: '',
            logType: 'Warning',
            timestamp: '2025-01-24T10:01:00Z',
            file: 'WarningScript.cs',
            line: 15
          },
          {
            message: 'Error occurred',
            stackTrace: 'at ErrorClass.ErrorMethod()',
            logType: 'Error',
            timestamp: '2025-01-24T10:02:00Z',
            file: 'ErrorScript.cs',
            line: 99
          },
          {
            message: 'Exception caught',
            stackTrace: 'at ExceptionClass.ExceptionMethod()',
            logType: 'Exception',
            timestamp: '2025-01-24T10:03:00Z',
            file: 'ExceptionScript.cs',
            line: 50
          }
        ],
        count: 4,
        totalCaptured: 200
      }))
    };
    
    handler = new ReadConsoleToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'read_console');
      assert.equal(handler.description, 'Read Unity console logs with advanced filtering');
      assert.ok(handler.inputSchema);
      assert.equal(typeof handler.execute, 'function');
    });

    it('should define comprehensive input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.count);
      assert.ok(schema.properties.logTypes);
      assert.ok(schema.properties.filterText);
      assert.ok(schema.properties.includeStackTrace);
      assert.ok(schema.properties.format);
      assert.ok(schema.properties.sinceTimestamp);
      assert.ok(schema.properties.untilTimestamp);
      assert.ok(schema.properties.sortOrder);
      assert.ok(schema.properties.groupBy);
      assert.deepEqual(schema.required, []);
    });

    it('should define proper enum values including ErrorsAndExceptions', () => {
      const schema = handler.inputSchema;
      assert.deepEqual(
        schema.properties.logTypes.items.enum, 
        ['Log', 'Warning', 'Error', 'Assert', 'Exception', 'ErrorsAndExceptions', 'All']
      );
      assert.deepEqual(schema.properties.format.enum, ['detailed', 'compact', 'json', 'plain']);
      assert.deepEqual(schema.properties.sortOrder.enum, ['newest', 'oldest']);
      assert.deepEqual(schema.properties.groupBy.enum, ['none', 'type', 'file', 'time']);
    });
  });

  describe('validate', () => {
    it('should pass with no parameters', () => {
      assert.doesNotThrow(() => {
        handler.validate({});
      });
    });

    it('should pass with valid count', () => {
      assert.doesNotThrow(() => {
        handler.validate({ count: 50 });
      });
    });

    it('should fail with invalid count', () => {
      assert.throws(
        () => handler.validate({ count: 1500 }),
        /count must be between 1 and 1000/
      );
    });

    it('should fail with negative count', () => {
      assert.throws(
        () => handler.validate({ count: -5 }),
        /count must be between 1 and 1000/
      );
    });

    it('should pass with valid log types array', () => {
      assert.doesNotThrow(() => {
        handler.validate({ logTypes: ['Error', 'Warning'] });
      });
    });

    it('should pass with ErrorsAndExceptions log type', () => {
      assert.doesNotThrow(() => {
        handler.validate({ logTypes: ['ErrorsAndExceptions'] });
      });
    });

    it('should pass with mixed log types including ErrorsAndExceptions', () => {
      assert.doesNotThrow(() => {
        handler.validate({ logTypes: ['Log', 'ErrorsAndExceptions', 'Warning'] });
      });
    });

    it('should fail with invalid log type', () => {
      assert.throws(
        () => handler.validate({ logTypes: ['Error', 'InvalidType'] }),
        /Invalid log type: InvalidType/
      );
    });

    it('should pass with valid timestamp', () => {
      assert.doesNotThrow(() => {
        handler.validate({ sinceTimestamp: '2025-01-24T10:00:00Z' });
      });
    });

    it('should fail with invalid timestamp format', () => {
      assert.throws(
        () => handler.validate({ sinceTimestamp: '2025-01-24' }),
        /sinceTimestamp must be a valid ISO 8601 timestamp/
      );
    });

    it('should fail when untilTimestamp is before sinceTimestamp', () => {
      assert.throws(
        () => handler.validate({ 
          sinceTimestamp: '2025-01-24T12:00:00Z',
          untilTimestamp: '2025-01-24T10:00:00Z'
        }),
        /untilTimestamp must be after sinceTimestamp/
      );
    });

    it('should pass with valid format', () => {
      assert.doesNotThrow(() => {
        handler.validate({ format: 'compact' });
      });
    });

    it('should fail with invalid format', () => {
      assert.throws(
        () => handler.validate({ format: 'xml' }),
        /format must be one of/
      );
    });
  });

  describe('execute', () => {
    it('should read logs with default settings', async () => {
      const result = await handler.execute({});

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockUnityConnection.sendCommand.mock.calls[0].arguments[0], 'read_console');
      
      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.count, 100);
      assert.deepEqual(params.logTypes, ['All']);
      assert.equal(params.includeStackTrace, true);
      assert.equal(params.format, 'detailed');
      assert.equal(params.sortOrder, 'newest');
      assert.equal(params.groupBy, 'none');

      assert.ok(result.logs);
      assert.equal(result.logs.length, 4);
      assert.equal(result.count, 4);
    });

    it('should expand ErrorsAndExceptions to Error and Exception types', async () => {
      await handler.execute({
        logTypes: ['ErrorsAndExceptions']
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.deepEqual(params.logTypes, ['Error', 'Exception']);
    });

    it('should expand ErrorsAndExceptions and preserve other log types', async () => {
      await handler.execute({
        logTypes: ['Log', 'ErrorsAndExceptions', 'Warning']
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      // Should expand ErrorsAndExceptions to Error and Exception, then deduplicate
      assert.ok(params.logTypes.includes('Log'));
      assert.ok(params.logTypes.includes('Error'));
      assert.ok(params.logTypes.includes('Exception'));
      assert.ok(params.logTypes.includes('Warning'));
      assert.ok(!params.logTypes.includes('ErrorsAndExceptions'));
    });

    it('should remove duplicates when expanding ErrorsAndExceptions', async () => {
      await handler.execute({
        logTypes: ['Error', 'ErrorsAndExceptions', 'Exception']
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      // Should have Error and Exception only once each
      const errorCount = params.logTypes.filter(type => type === 'Error').length;
      const exceptionCount = params.logTypes.filter(type => type === 'Exception').length;
      assert.equal(errorCount, 1);
      assert.equal(exceptionCount, 1);
    });

    it('should handle multiple ErrorsAndExceptions entries', async () => {
      await handler.execute({
        logTypes: ['ErrorsAndExceptions', 'Log', 'ErrorsAndExceptions']
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      // Should deduplicate everything
      assert.ok(params.logTypes.includes('Log'));
      assert.ok(params.logTypes.includes('Error'));
      assert.ok(params.logTypes.includes('Exception'));
      assert.ok(!params.logTypes.includes('ErrorsAndExceptions'));
      // Should not have duplicates
      assert.equal(params.logTypes.length, [...new Set(params.logTypes)].length);
    });

    it('should filter by text', async () => {
      await handler.execute({
        filterText: 'error'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.filterText, 'error');
    });

    it('should handle time range filtering', async () => {
      await handler.execute({
        sinceTimestamp: '2025-01-24T10:00:00Z',
        untilTimestamp: '2025-01-24T11:00:00Z'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.sinceTimestamp, '2025-01-24T10:00:00Z');
      assert.equal(params.untilTimestamp, '2025-01-24T11:00:00Z');
    });

    it('should connect if not connected', async () => {
      mockUnityConnection.isConnected.mock.mockImplementation(() => false);

      await handler.execute({});

      assert.equal(mockUnityConnection.connect.mock.calls.length, 1);
    });

    it('should handle Unity connection errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => {
        throw new Error('Unity not responding');
      });

      await assert.rejects(
        () => handler.execute({}),
        /Unity not responding/
      );
    });

    it('should handle Unity response errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Console read failed'
      }));

      await assert.rejects(
        () => handler.execute({}),
        /Console read failed/
      );
    });

    it('should handle empty logs result', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        logs: [],
        count: 0,
        totalCaptured: 0
      }));

      const result = await handler.execute({});

      assert.equal(result.logs.length, 0);
      assert.equal(result.count, 0);
    });

    it('should include optional response fields', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        logs: [],
        count: 0,
        totalCaptured: 500,
        filteredCount: 50,
        statistics: {
          errors: 25,
          warnings: 100,
          logs: 300,
          asserts: 25,
          exceptions: 50
        },
        format: 'compact',
        groupBy: 'type',
        groupedLogs: {
          Error: [],
          Warning: []
        }
      }));

      const result = await handler.execute({});

      assert.ok(result.statistics);
      assert.equal(result.filteredCount, 50);
      assert.equal(result.format, 'compact');
      assert.equal(result.groupBy, 'type');
      assert.ok(result.groupedLogs);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        count: 50,
        logTypes: ['ErrorsAndExceptions']
      });

      assert.ok(result.logs);
      assert.equal(typeof result, 'object');
    });
  });

  describe('isValidISO8601', () => {
    it('should validate correct ISO 8601 timestamps', () => {
      assert.ok(handler.isValidISO8601('2025-01-24T10:00:00Z'));
      assert.ok(handler.isValidISO8601('2025-01-24T10:00:00.000Z'));
      assert.ok(handler.isValidISO8601('2025-12-31T23:59:59'));
    });

    it('should reject invalid timestamp formats', () => {
      assert.ok(!handler.isValidISO8601('2025-01-24'));
      assert.ok(!handler.isValidISO8601('24-01-2025T10:00:00Z'));
      assert.ok(!handler.isValidISO8601('invalid-timestamp'));
      assert.ok(!handler.isValidISO8601(''));
    });
  });
});