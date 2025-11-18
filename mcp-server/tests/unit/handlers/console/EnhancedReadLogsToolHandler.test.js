import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EnhancedReadLogsToolHandler } from '../../../../src/handlers/console/EnhancedReadLogsToolHandler.js';

describe('EnhancedReadLogsToolHandler', () => {
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
          }
        ],
        count: 3,
        totalCaptured: 150
      }))
    };

    handler = new EnhancedReadLogsToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'enhanced_read_logs');
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
      assert.equal(schema.required, undefined);
    });

    it('should define proper enum values', () => {
      const schema = handler.inputSchema;
      assert.deepEqual(schema.properties.logTypes.items.enum, [
        'Log',
        'Warning',
        'Error',
        'Assert',
        'Exception',
        'All'
      ]);
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
      assert.throws(() => handler.validate({ count: 1500 }), /count must be between 1 and 1000/);
    });

    it('should fail with negative count', () => {
      assert.throws(() => handler.validate({ count: -5 }), /count must be between 1 and 1000/);
    });

    it('should pass with valid log types array', () => {
      assert.doesNotThrow(() => {
        handler.validate({ logTypes: ['Error', 'Warning'] });
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
        () =>
          handler.validate({
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
      assert.throws(() => handler.validate({ format: 'xml' }), /format must be one of/);
    });
  });

  describe('execute', () => {
    it('should read logs with default settings', async () => {
      const result = await handler.execute({});

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.equal(
        mockUnityConnection.sendCommand.mock.calls[0].arguments[0],
        'enhanced_read_logs'
      );

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.count, 100);
      assert.deepEqual(params.logTypes, ['All']);
      assert.equal(params.includeStackTrace, true);
      assert.equal(params.format, 'detailed');
      assert.equal(params.sortOrder, 'newest');
      assert.equal(params.groupBy, 'none');

      assert.ok(result.logs);
      assert.equal(result.logs.length, 3);
      assert.equal(result.count, 3);
    });

    it('should filter by log types', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async (cmd, params) => ({
        success: true,
        logs: [
          {
            message: 'Error occurred',
            logType: 'Error',
            timestamp: '2025-01-24T10:02:00Z'
          }
        ],
        count: 1,
        totalCaptured: 150,
        filteredCount: 1
      }));

      const result = await handler.execute({
        logTypes: ['Error', 'Warning']
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.deepEqual(params.logTypes, ['Error', 'Warning']);
      assert.equal(result.filteredCount, 1);
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

    it('should format logs in compact mode', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        logs: [
          {
            message: 'Test log',
            logType: 'Log',
            timestamp: '2025-01-24T10:00:00Z',
            formattedCompact: '[Log] Test log'
          }
        ],
        count: 1,
        format: 'compact'
      }));

      const result = await handler.execute({
        format: 'compact',
        includeStackTrace: false
      });

      assert.equal(result.format, 'compact');
      assert.ok(result.logs[0].formattedCompact);
    });

    it('should group logs by type', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        groupedLogs: {
          Error: [{ message: 'Error 1' }, { message: 'Error 2' }],
          Warning: [{ message: 'Warning 1' }],
          Log: [{ message: 'Log 1' }]
        },
        count: 4,
        groupBy: 'type'
      }));

      const result = await handler.execute({
        groupBy: 'type'
      });

      assert.ok(result.groupedLogs);
      assert.equal(result.groupedLogs.Error.length, 2);
      assert.equal(result.groupedLogs.Warning.length, 1);
    });

    it('should sort logs by oldest first', async () => {
      await handler.execute({
        sortOrder: 'oldest'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.sortOrder, 'oldest');
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

      await assert.rejects(() => handler.execute({}), /Unity not responding/);
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

    it('should include log statistics', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        logs: [],
        count: 0,
        totalCaptured: 500,
        statistics: {
          errors: 50,
          warnings: 100,
          logs: 300,
          asserts: 25,
          exceptions: 25
        }
      }));

      const result = await handler.execute({});

      assert.ok(result.statistics);
      assert.equal(result.statistics.errors, 50);
      assert.equal(result.statistics.warnings, 100);
    });

    it('should handle All log type selection', async () => {
      await handler.execute({
        logTypes: ['All']
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.deepEqual(params.logTypes, ['All']);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        count: 50,
        logTypes: ['Error', 'Warning']
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result.logs);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({
        format: 'invalid'
      });

      assert.equal(result.status, 'error');
      assert.ok(result.error.includes('format must be one of'));
    });
  });
});
