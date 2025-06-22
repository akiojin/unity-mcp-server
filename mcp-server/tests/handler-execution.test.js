import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CreateGameObjectToolHandler } from '../src/handlers/CreateGameObjectToolHandler.js';
import { MockUnityServer, testUtils } from './test-utils.js';
import { UnityConnection } from '../src/unityConnection.js';

describe('Handler Execution Tests', () => {
  let mockUnity;
  let unityConnection;
  let handler;

  before(async () => {
    mockUnity = new MockUnityServer(6402);
    await mockUnity.start();
    process.env.UNITY_PORT = '6402';
  });

  after(async () => {
    await mockUnity.stop();
    delete process.env.UNITY_PORT;
  });

  beforeEach(async () => {
    unityConnection = new UnityConnection();
    handler = new CreateGameObjectToolHandler(unityConnection);
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
      }, /layer must be a number between 0 and 31/);
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
      // Disconnect Unity
      await mockUnity.stop();
      
      const result = await handler.handle({ name: 'FailObject' });
      
      assert.strictEqual(result.status, 'error');
      assert.ok(result.error.includes('ECONNREFUSED'));
      assert.strictEqual(result.code, 'TOOL_ERROR');
      
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
      
      // Force an error
      await mockUnity.stop();
      
      const result = await handler.handle({ name: 'ErrorTest' });
      
      assert.strictEqual(result.status, 'error');
      assert.ok(result.details.stack); // Stack trace included in dev mode
      
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
    it('should handle multiple concurrent requests', async () => {
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(handler.handle({ name: `Object${i}` }));
      }
      
      const results = await Promise.all(requests);
      
      assert.strictEqual(results.length, 10);
      results.forEach((result, i) => {
        assert.strictEqual(result.status, 'success');
        assert.strictEqual(result.result.name, `Object${i}`);
      });
    });
  });
});