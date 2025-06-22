import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from './server.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

describe('Server', () => {
  let testSetup;
  let server;
  let unityConnection;
  let mockConfig;
  let requestHandlers;

  beforeEach(async () => {
    mockConfig = {
      server: {
        name: 'test-unity-mcp',
        version: '1.0.0'
      }
    };
    
    testSetup = await createServer(mockConfig);
    server = testSetup.server;
    unityConnection = testSetup.unityConnection;
    
    // Track request handlers
    requestHandlers = new Map();
    const originalSetRequestHandler = server.setRequestHandler.bind(server);
    server.setRequestHandler = mock.fn((schema, handler) => {
      requestHandlers.set(schema.method, handler);
      return originalSetRequestHandler(schema, handler);
    });
    
    // Mock Unity connection
    unityConnection.isConnected = mock.fn(() => true);
    unityConnection.sendCommand = mock.fn(async () => ({
      status: 'success',
      data: {}
    }));
  });

  afterEach(async () => {
    if (server && server.close) {
      await server.close();
    }
  });

  describe('createServer', () => {
    it('should create server with correct configuration', () => {
      assert.ok(server);
      assert.ok(unityConnection);
      // The actual server info is set during construction
      assert.equal(typeof server.connect, 'function');
      assert.equal(typeof server.setRequestHandler, 'function');
    });

    it('should return both server and unity connection', () => {
      assert.ok(testSetup.server);
      assert.ok(testSetup.unityConnection);
    });
  });

  describe('Tool functionality', () => {
    it('should execute ping tool successfully', async () => {
      // Mock the Unity response
      unityConnection.sendCommand.mock.mockImplementation(async (command) => {
        if (command === 'ping') {
          return {
            message: 'pong',
            timestamp: '2024-01-01T00:00:00.000Z'
          };
        }
        return { status: 'success' };
      });
      
      // Import and test the handler directly
      const { PingToolHandler } = await import('./handlers/PingToolHandler.js');
      const pingHandler = new PingToolHandler(unityConnection);
      
      const result = await pingHandler.handle({ message: 'test' });
      
      assert.equal(result.status, 'success');
      assert.equal(result.result.message, 'pong');
    });

    it('should handle create_gameobject with validation', async () => {
      const { CreateGameObjectToolHandler } = await import('./handlers/CreateGameObjectToolHandler.js');
      const handler = new CreateGameObjectToolHandler(unityConnection);
      
      // Test validation error
      const errorResult = await handler.handle({
        primitiveType: 'invalid_type'
      });
      
      assert.equal(errorResult.status, 'error');
      assert.ok(errorResult.error.includes('primitiveType must be one of'));
      
      // Test success
      unityConnection.sendCommand.mock.mockImplementation(async () => ({
        id: -1000,
        name: 'TestCube',
        path: '/TestCube',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        tag: 'Untagged',
        layer: 0,
        isActive: true
      }));
      
      const successResult = await handler.handle({
        name: 'TestCube',
        primitiveType: 'cube'
      });
      
      assert.equal(successResult.status, 'success');
      assert.equal(successResult.result.name, 'TestCube');
    });
  });

  describe('Handler registration', () => {
    it('should create all expected handlers', async () => {
      // Import createHandlers to test it directly
      const { createHandlers } = await import('./handlers/index.js');
      const handlers = createHandlers(unityConnection);
      
      assert.ok(handlers instanceof Map);
      assert.equal(handlers.size, 18);
      
      // Check for some key handlers
      assert.ok(handlers.has('ping'));
      assert.ok(handlers.has('create_gameobject'));
      assert.ok(handlers.has('get_hierarchy'));
      assert.ok(handlers.has('analyze_scene_contents'));
    });

    it('should have handlers with correct structure', async () => {
      const { createHandlers } = await import('./handlers/index.js');
      const handlers = createHandlers(unityConnection);
      
      for (const [name, handler] of handlers) {
        assert.equal(handler.name, name);
        assert.ok(handler.description);
        assert.ok(handler.inputSchema);
        assert.equal(typeof handler.handle, 'function');
        assert.equal(typeof handler.execute, 'function');
        assert.equal(typeof handler.validate, 'function');
        assert.equal(typeof handler.getDefinition, 'function');
      }
    });
  });

  describe('Unity connection handling', () => {
    it('should handle Unity connection errors gracefully', async () => {
      const { PingToolHandler } = await import('./handlers/PingToolHandler.js');
      const handler = new PingToolHandler(unityConnection);
      
      unityConnection.sendCommand.mock.mockImplementation(async () => {
        throw new Error('Unity not responding');
      });
      
      const result = await handler.handle({});
      
      assert.equal(result.status, 'error');
      assert.equal(result.error, 'Unity not responding');
      assert.equal(result.code, 'TOOL_ERROR');
    });

    it('should connect to Unity if not connected', async () => {
      unityConnection.isConnected.mock.mockImplementation(() => false);
      unityConnection.connect = mock.fn(async () => {});
      
      const { PingToolHandler } = await import('./handlers/PingToolHandler.js');
      const handler = new PingToolHandler(unityConnection);
      
      unityConnection.sendCommand.mock.mockImplementation(async () => ({
        message: 'pong'
      }));
      
      await handler.execute({});
      
      assert.equal(unityConnection.connect.mock.calls.length, 1);
    });
  });

  describe('Error handling', () => {
    it('should handle handler exceptions', async () => {
      const { BaseToolHandler } = await import('./handlers/BaseToolHandler.js');
      
      class ErrorHandler extends BaseToolHandler {
        constructor() {
          super('error_test', 'Test error handling');
        }
        async execute() {
          throw new Error('Test error');
        }
      }
      
      const handler = new ErrorHandler();
      const result = await handler.handle({});
      
      assert.equal(result.status, 'error');
      assert.equal(result.error, 'Test error');
      assert.equal(result.details.tool, 'error_test');
    });

    it('should include error codes when available', async () => {
      const { BaseToolHandler } = await import('./handlers/BaseToolHandler.js');
      
      class CodedErrorHandler extends BaseToolHandler {
        constructor() {
          super('coded_error_test', 'Test coded error');
        }
        async execute() {
          const error = new Error('Coded error');
          error.code = 'CUSTOM_ERROR_CODE';
          throw error;
        }
      }
      
      const handler = new CodedErrorHandler();
      const result = await handler.handle({});
      
      assert.equal(result.status, 'error');
      assert.equal(result.code, 'CUSTOM_ERROR_CODE');
    });
  });
});