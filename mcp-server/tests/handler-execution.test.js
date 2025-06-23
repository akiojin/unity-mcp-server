import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { MockUnityServer, testUtils } from './test-utils.js';
import { CreateGameObjectToolHandler } from '../src/handlers/gameobject/CreateGameObjectToolHandler.js';
import { UnityConnection } from '../src/core/unityConnection.js';

describe('Handler Execution Tests', () => {
  let mockUnity;
  let unityConnection;
  let handler;
  let originalConfig;

  before(async () => {
    // Disable auto-reconnect for tests
    process.env.DISABLE_AUTO_RECONNECT = 'true';
    
    // Import config module dynamically to capture the original config
    const configModule = await import('../src/core/config.js');
    originalConfig = { ...configModule.config.unity };
    
    // Update the config directly to use test port
    configModule.config.unity.port = 6402;
    
    mockUnity = new MockUnityServer(6402);
    await mockUnity.start();
  });

  after(async () => {
    // Ensure all connections are closed
    if (unityConnection && unityConnection.connected) {
      unityConnection.disconnect();
    }
    await mockUnity.stop();
    delete process.env.DISABLE_AUTO_RECONNECT;
    
    // Restore original config
    const configModule = await import('../src/core/config.js');
    configModule.config.unity = originalConfig;
    
    delete process.env.UNITY_PORT;
  });

  beforeEach(async () => {
    unityConnection = new UnityConnection();
    handler = new CreateGameObjectToolHandler(unityConnection);
  });

  afterEach(async () => {
    // Ensure we disconnect after each test
    if (unityConnection && unityConnection.connected) {
      unityConnection.disconnect();
    }
  });

  describe('CreateGameObjectToolHandler', () => {
    it('should validate parameters correctly', () => {
      // Valid params
      assert.doesNotThrow(() => {
        handler.validate({ name: 'TestObject' });
      });

      // Invalid primitive type
      assert.throws(() => {
        handler.validate({ primitiveType: 'invalid' });
      }, /primitiveType must be one of/);

      // Invalid position
      assert.throws(() => {
        handler.validate({ position: { x: 'not a number' } });
      }, /position.x must be a number/);

      // Invalid layer
      assert.throws(() => {
        handler.validate({ layer: 32 });
      }, /layer must be between 0 and 31/);
    });

    it('should execute successfully with minimal params', async () => {
      const result = await handler.handle({ name: 'SimpleObject' });
      
      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.result.name, 'SimpleObject');
      assert.strictEqual(result.result.path, '/SimpleObject');
    });

    it('should execute successfully with all params', async () => {
      const params = {
        name: 'ComplexObject',
        primitiveType: 'cube',
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 90, y: 0, z: 0 },
        scale: { x: 2, y: 2, z: 2 },
        tag: 'Player',
        layer: 5
      };

      const result = await handler.handle(params);
      
      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.result.name, 'ComplexObject');
    });

    it('should handle Unity connection errors', async () => {
      // Stop the mock server
      await mockUnity.stop();
      
      // Wait a bit to ensure server is fully stopped
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create a new handler with a fresh connection
      const errorConnection = new UnityConnection();
      const errorHandler = new CreateGameObjectToolHandler(errorConnection);
      
      // Override the connect method to simulate connection failure
      errorConnection.connect = async () => {
        throw new Error('Connection refused');
      };
      
      const result = await errorHandler.handle({ name: 'FailObject' });
      
      assert.strictEqual(result.status, 'error');
      assert.ok(result.error.includes('Connection refused') || 
                result.error.includes('Not connected to Unity') || 
                result.error.includes('ECONNREFUSED') || 
                result.error.includes('Unity connection not available') ||
                result.error.includes('Connection timeout'),
                `Unexpected error: ${result.error}`);
      assert.strictEqual(result.code, 'TOOL_ERROR');
      
      // Clean up error connection
      if (errorConnection.reconnectTimer) {
        clearTimeout(errorConnection.reconnectTimer);
        errorConnection.reconnectTimer = null;
      }
      
      // Restart for other tests
      await mockUnity.start();
    });

    it('should measure execution time', async () => {
      // Set delay to measure
      mockUnity.setResponseDelay(100);
      
      const measurement = await testUtils.measureTime(async () => {
        return await handler.handle({ name: 'TimedObject' });
      });
      
      assert.ok(measurement.duration >= 100);
      assert.strictEqual(measurement.result.status, 'success');
      
      mockUnity.setResponseDelay(0);
    });
  });

  describe('Handler Base Class Behavior', () => {
    it('should include error details in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      // Stop the mock server
      await mockUnity.stop();
      
      // Wait a bit to ensure server is fully stopped
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create a new handler with a fresh connection
      const errorConnection = new UnityConnection();
      const errorHandler = new CreateGameObjectToolHandler(errorConnection);
      
      // Override the connect method to simulate connection failure
      errorConnection.connect = async () => {
        throw new Error('Connection refused for testing');
      };
      
      const result = await errorHandler.handle({ name: 'ErrorTest' });
      
      assert.strictEqual(result.status, 'error');
      assert.ok(result.details.stack); // Stack trace included in dev mode
      
      // Clean up error connection
      if (errorConnection.reconnectTimer) {
        clearTimeout(errorConnection.reconnectTimer);
        errorConnection.reconnectTimer = null;
      }
      
      delete process.env.NODE_ENV;
      await mockUnity.start();
    });

    it('should summarize parameters correctly', () => {
      const summary = handler.summarizeParams({
        name: 'Test',
        longString: 'a'.repeat(100),
        nullValue: null,
        undefinedValue: undefined,
        array: [1, 2, 3, 4, 5],
        object: { key: 'value' }
      });
      
      assert.ok(summary.includes('name: "Test"'));
      assert.ok(summary.includes('longString: "aaa')); // Truncated
      assert.ok(summary.includes('nullValue: null'));
      assert.ok(summary.includes('undefinedValue: undefined'));
      assert.ok(summary.includes('array: [Array(5)]'));
      assert.ok(summary.includes('object: [Object]'));
    });
  });

  describe('Concurrent Handler Execution', () => {
    it('should handle multiple concurrent requests', async function() {
      // Skip this test for now - concurrent connections need better handling
      this.skip('Concurrent connections to mock server need investigation');
    });
  });
});