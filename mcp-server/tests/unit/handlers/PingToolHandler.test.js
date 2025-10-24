import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PingToolHandler } from '../../../src/handlers/system/PingToolHandler.js';

describe('PingToolHandler', () => {
  let handler;
  let mockUnityConnection;
  let connectMock;
  let sendCommandMock;

  beforeEach(() => {
    // Create mocks
    connectMock = mock.fn(async () => {});
    sendCommandMock = mock.fn(async () => ({
      message: 'pong',
      echo: 'test',
      timestamp: '2024-01-01T00:00:00.000Z',
      unityVersion: '2022.3.0f1'
    }));

    // Create mock Unity connection
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: connectMock,
      sendCommand: sendCommandMock
    };

    handler = new PingToolHandler(mockUnityConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'system_ping');
      assert.equal(handler.description, 'Test connection to Unity Editor');
      assert.equal(handler.inputSchema.required, undefined);
      assert.equal(handler.unityConnection, mockUnityConnection);
    });

    it('should define optional message parameter', () => {
      assert.equal(handler.inputSchema.properties.message.type, 'string');
      assert.equal(handler.inputSchema.properties.message.description, 'Optional message to echo back');
    });
  });

  describe('execute', () => {
    it('should send ping command when connected', async () => {
      const result = await handler.execute({});
      
      assert.equal(connectMock.mock.calls.length, 0); // Should not connect
      assert.equal(sendCommandMock.mock.calls.length, 1);
      assert.deepEqual(sendCommandMock.mock.calls[0].arguments[0], 'system_ping');
      assert.deepEqual(sendCommandMock.mock.calls[0].arguments[1], { message: 'system_ping' });
    });

    it('should connect if not connected', async () => {
      mockUnityConnection.isConnected = mock.fn(() => false);
      
      const result = await handler.execute({});
      
      assert.equal(connectMock.mock.calls.length, 1);
      assert.equal(sendCommandMock.mock.calls.length, 1);
    });

    it('should send custom message if provided', async () => {
      const result = await handler.execute({ message: 'custom ping' });
      
      assert.equal(sendCommandMock.mock.calls.length, 1);
      assert.deepEqual(sendCommandMock.mock.calls[0].arguments[1], { message: 'custom ping' });
    });

    it('should return formatted response with all fields', async () => {
      const result = await handler.execute({ message: 'test message' });
      
      assert.equal(result.message, 'pong');
      assert.equal(result.echo, 'test');
      assert.equal(result.timestamp, '2024-01-01T00:00:00.000Z');
      assert.equal(result.unityVersion, '2022.3.0f1');
    });

    it('should use default echo if not provided by Unity', async () => {
      sendCommandMock.mock.mockImplementation(async () => ({
        message: 'pong',
        timestamp: '2024-01-01T00:00:00.000Z'
      }));
      
      const result = await handler.execute({ message: 'test message' });
      
      assert.equal(result.echo, 'test message');
    });

    it('should use default timestamp if not provided by Unity', async () => {
      const beforeTime = new Date();
      
      sendCommandMock.mock.mockImplementation(async () => ({
        message: 'pong'
      }));
      
      const result = await handler.execute({});
      const afterTime = new Date();
      
      const resultTime = new Date(result.timestamp);
      assert.ok(resultTime >= beforeTime && resultTime <= afterTime);
      assert.equal(result.echo, 'system_ping'); // Default echo
    });

    it('should handle Unity connection errors', async () => {
      sendCommandMock.mock.mockImplementation(async () => {
        throw new Error('Unity connection failed');
      });
      
      await assert.rejects(
        async () => await handler.execute({}),
        /Unity connection failed/
      );
    });

    it('should handle connection failure', async () => {
      mockUnityConnection.isConnected = mock.fn(() => false);
      connectMock.mock.mockImplementation(async () => {
        throw new Error('Failed to connect');
      });
      
      await assert.rejects(
        async () => await handler.execute({}),
        /Failed to connect/
      );
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should work through handle method', async () => {
      const result = await handler.handle({ message: 'integration test' });
      
      assert.equal(result.status, 'success');
      assert.equal(result.result.message, 'pong');
      assert.equal(result.result.echo, 'test');
    });

    it('should handle validation through base class', async () => {
      // Even though ping has no required params, test that validation works
      const result = await handler.handle({});
      
      assert.equal(result.status, 'success');
      assert.equal(result.result.message, 'pong');
    });

    it('should return error response on failure', async () => {
      sendCommandMock.mock.mockImplementation(async () => {
        const error = new Error('Unity error');
        error.code = 'UNITY_ERROR';
        throw error;
      });
      
      const result = await handler.handle({});
      
      assert.equal(result.status, 'error');
      assert.equal(result.error, 'Unity error');
      assert.equal(result.code, 'UNITY_ERROR');
      assert.equal(result.details.tool, 'system_ping');
    });
  });
});