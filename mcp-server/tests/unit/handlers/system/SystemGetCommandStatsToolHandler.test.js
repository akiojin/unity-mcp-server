import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { SystemGetCommandStatsToolHandler } from '../../../../src/handlers/system/SystemGetCommandStatsToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('SystemGetCommandStatsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        totalCommands: 150,
        commandCounts: {
          create_gameobject: 25,
          modify_gameobject: 30,
          get_hierarchy: 45,
          capture_screenshot: 10,
          run_unity_tests: 5
        },
        recentCommands: [
          { command: 'get_hierarchy', timestamp: '2025-01-17T12:00:00Z' },
          { command: 'modify_gameobject', timestamp: '2025-01-17T11:59:00Z' },
          { command: 'capture_screenshot', timestamp: '2025-01-17T11:58:00Z' }
        ]
      }
    });
    handler = new SystemGetCommandStatsToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'system_get_command_stats');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('command'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.deepEqual(schema.properties, {});
      assert.deepEqual(schema.required, []);
    });
  });

  describe('validate', () => {
    it('should pass with no parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });
  });

  describe('execute', () => {
    it('should execute successfully with no params', async () => {
      const result = await handler.execute({});

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'get_command_stats');

      assert.ok(result);
      assert.equal(result.success, true);
    });

    it('should return total command count', async () => {
      const result = await handler.execute({});

      assert.ok(result.totalCommands !== undefined);
      assert.equal(typeof result.totalCommands, 'number');
      assert.equal(result.totalCommands, 150);
    });

    it('should return command counts by type', async () => {
      const result = await handler.execute({});

      assert.ok(result.commandCounts);
      assert.equal(typeof result.commandCounts, 'object');
      assert.equal(result.commandCounts['create_gameobject'], 25);
      assert.equal(result.commandCounts['get_hierarchy'], 45);
    });

    it('should return recent commands', async () => {
      const result = await handler.execute({});

      assert.ok(result.recentCommands);
      assert.ok(Array.isArray(result.recentCommands));
      assert.equal(result.recentCommands.length, 3);
      assert.equal(result.recentCommands[0].command, 'get_hierarchy');
    });

    it('should connect if not already connected', async () => {
      mockConnection.isConnected.mock.mockImplementationOnce(() => false);

      await handler.execute({});

      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });

    it('should handle empty stats gracefully', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          totalCommands: 0,
          commandCounts: {},
          recentCommands: []
        }
      });
      handler = new SystemGetCommandStatsToolHandler(mockConnection);

      const result = await handler.execute({});

      assert.equal(result.totalCommands, 0);
      assert.deepEqual(result.commandCounts, {});
      assert.deepEqual(result.recentCommands, []);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({});

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({});

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
    });
  });
});
