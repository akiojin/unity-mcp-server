import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerPingTool } from '../../../../src/tools/system/ping.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';

describe('Ping Tool', () => {
  let mockServer;
  let mockUnityConnection;
  let toolsListHandler;
  let toolsCallHandler;

  beforeEach(() => {
    // Mock server
    mockServer = {
      setRequestHandler: mock.fn((schema, handler) => {
        if (schema === ListToolsRequestSchema) {
          toolsListHandler = handler;
        } else if (schema === CallToolRequestSchema) {
          toolsCallHandler = handler;
        }
      })
    };

    // Mock Unity connection
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async (type, params) => ({
        message: 'pong',
        echo: params?.message || 'ping',
        timestamp: '2025-06-21T10:00:00.000Z'
      }))
    };
  });

  describe('registerPingTool', () => {
    it('should register handlers with server', () => {
      registerPingTool(mockServer, mockUnityConnection);
      
      assert.equal(mockServer.setRequestHandler.mock.calls.length, 2);
      assert.equal(mockServer.setRequestHandler.mock.calls[0].arguments[0], ListToolsRequestSchema);
      assert.equal(mockServer.setRequestHandler.mock.calls[1].arguments[0], CallToolRequestSchema);
    });

    it('should setup tool handlers correctly', () => {
      registerPingTool(mockServer, mockUnityConnection);
      
      // Handlers should be registered
      assert(toolsListHandler, 'List tools handler should be registered');
      assert(toolsCallHandler, 'Call tool handler should be registered');
    });
  });

  describe('tools/list handler', () => {
    beforeEach(() => {
      registerPingTool(mockServer, mockUnityConnection);
    });

    it('should return list of tools', async () => {
      const result = await toolsListHandler();
      
      assert.deepEqual(result, {
        tools: [{
          name: 'ping',
          description: 'Test connection to Unity Editor',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Optional message to echo back'
              }
            },
            required: []
          }
        }]
      });
    });
  });

  describe('tools/call handler', () => {
    beforeEach(() => {
      registerPingTool(mockServer, mockUnityConnection);
    });

    it('should handle ping with no message', async () => {
      const request = {
        params: {
          name: 'ping',
          arguments: {}
        }
      };
      
      const result = await toolsCallHandler(request);
      
      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockUnityConnection.sendCommand.mock.calls[0].arguments[0], 'ping');
      assert.deepEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1], {
        message: 'ping'
      });
      
      assert.deepEqual(result, {
        content: [
          {
            type: 'text',
            text: 'Unity responded: pong (echo: ping)'
          }
        ]
      });
    });

    it('should handle ping with custom message', async () => {
      const request = {
        params: {
          name: 'ping',
          arguments: {
            message: 'Hello Unity!'
          }
        }
      };
      
      const result = await toolsCallHandler(request);
      
      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.deepEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1], {
        message: 'Hello Unity!'
      });
      
      assert.deepEqual(result, {
        content: [
          {
            type: 'text',
            text: 'Unity responded: pong (echo: Hello Unity!)'
          }
        ]
      });
    });

    it('should connect if not connected', async () => {
      mockUnityConnection.isConnected.mock.mockImplementation(() => false);
      
      const request = {
        params: {
          name: 'ping',
          arguments: {}
        }
      };
      
      await toolsCallHandler(request);
      
      assert.equal(mockUnityConnection.connect.mock.calls.length, 1);
      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
    });

    it('should handle ping failure', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => {
        throw new Error('Connection timeout');
      });
      
      const request = {
        params: {
          name: 'ping',
          arguments: {}
        }
      };
      
      const result = await toolsCallHandler(request);
      
      assert.deepEqual(result, {
        content: [
          {
            type: 'text',
            text: 'Failed to ping Unity: Connection timeout'
          }
        ],
        isError: true
      });
    });

    it('should handle unknown tool', async () => {
      const request = {
        params: {
          name: 'unknown-tool',
          arguments: {}
        }
      };
      
      await assert.rejects(
        async () => await toolsCallHandler(request),
        /Tool not found: unknown-tool/
      );
    });
  });
});