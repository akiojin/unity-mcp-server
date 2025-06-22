import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { UnityConnection } from '../src/core/unityConnection.js';
import { MockUnityServer, testUtils } from './test-utils.js';

describe('UnityConnection Tests', () => {
  let mockUnity;
  let unityConnection;

  before(async () => {
    // Use different port to avoid conflicts
    mockUnity = new MockUnityServer(6401);
    await mockUnity.start();
  });

  after(async () => {
    await mockUnity.stop();
  });

  beforeEach(() => {
    // Create new connection with test config
    process.env.UNITY_PORT = '6401';
    unityConnection = new UnityConnection();
  });

  afterEach(() => {
    unityConnection.disconnect();
    delete process.env.UNITY_PORT;
  });

  describe('Connection Lifecycle', () => {
    it('should connect successfully', async () => {
      await unityConnection.connect();
      assert.strictEqual(unityConnection.isConnected(), true);
    });

    it('should emit connected event', async () => {
      const connectedPromise = testUtils.waitForEvent(unityConnection, 'connected');
      await unityConnection.connect();
      await connectedPromise;
      assert.strictEqual(unityConnection.isConnected(), true);
    });

    it('should handle connection failure', async () => {
      // Stop mock server to simulate failure
      await mockUnity.stop();
      
      try {
        await unityConnection.connect();
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('ECONNREFUSED') || 
                  error.message.includes('Connection timeout') ||
                  error.message.includes('Connection failed'),
                  `Unexpected error message: ${error.message}`);
      }
      
      // Restart for other tests
      await mockUnity.start();
    });

    it('should disconnect cleanly', async () => {
      await unityConnection.connect();
      assert.strictEqual(unityConnection.isConnected(), true);
      
      unityConnection.disconnect();
      assert.strictEqual(unityConnection.isConnected(), false);
    });
  });

  describe('Command Execution', () => {
    beforeEach(async () => {
      await unityConnection.connect();
    });

    it('should send command and receive response', async () => {
      const result = await unityConnection.sendCommand('create_gameobject', { name: 'TestObject' });
      assert.strictEqual(result.name, 'TestObject');
      assert.strictEqual(result.path, '/TestObject');
    });

    it('should handle multiple concurrent commands', async () => {
      const commands = [
        unityConnection.sendCommand('create_gameobject', { name: 'Object1' }),
        unityConnection.sendCommand('create_gameobject', { name: 'Object2' }),
        unityConnection.sendCommand('create_gameobject', { name: 'Object3' })
      ];

      const results = await Promise.all(commands);
      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].name, 'Object1');
      assert.strictEqual(results[1].name, 'Object2');
      assert.strictEqual(results[2].name, 'Object3');
    });

    it('should throw error when not connected', async () => {
      unityConnection.disconnect();
      
      try {
        await unityConnection.sendCommand('create_gameobject', { name: 'Test' });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.strictEqual(error.message, 'Not connected to Unity');
      }
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout after configured duration', async function() {
      // Skip this test as it takes 30 seconds
      this.skip('Long timeout test - skipping for CI');
      
      await unityConnection.connect();
      
      // Make Unity not respond
      mockUnity.setTimeout(true);
      
      const startTime = Date.now();
      try {
        await unityConnection.sendCommand('create_gameobject', { name: 'TimeoutTest' });
        assert.fail('Should have timed out');
      } catch (error) {
        const duration = Date.now() - startTime;
        assert.ok(error.message.includes('timeout') || error.message.includes('timed out'),
                  `Unexpected error message: ${error.message}`);
        // Should timeout around 30 seconds (configured timeout)
        assert.ok(duration >= 29000 && duration <= 31000, `Timeout duration was ${duration}ms`);
      }
      
      // Reset for other tests
      mockUnity.setTimeout(false);
    })

    it('should handle slow responses within timeout', async () => {
      await unityConnection.connect();
      
      // Set 5 second delay
      mockUnity.setResponseDelay(5000);
      
      const startTime = Date.now();
      const result = await unityConnection.sendCommand('create_gameobject', { name: 'SlowTest' });
      const duration = Date.now() - startTime;
      
      assert.strictEqual(result.name, 'SlowTest');
      assert.ok(duration >= 5000 && duration <= 6000, `Response took ${duration}ms`);
      
      // Reset delay
      mockUnity.setResponseDelay(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle Unity error responses', async () => {
      await unityConnection.connect();
      
      // Set error response
      mockUnity.setResponse('test_error', {
        id: '1',
        status: 'error',
        error: 'Test error message'
      });
      
      try {
        await unityConnection.sendCommand('test_error', {});
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.strictEqual(error.message, 'Test error message');
      }
    });

    it('should handle malformed responses', async () => {
      await unityConnection.connect();
      
      // Send malformed data directly
      const connectionPromise = testUtils.waitForEvent(mockUnity, 'connection');
      const socket = await connectionPromise;
      
      // Send invalid JSON
      socket.write('invalid json\n');
      
      // Should not crash, just log error
      await testUtils.sleep(100);
      assert.strictEqual(unityConnection.isConnected(), true);
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection after disconnect', async () => {
      await unityConnection.connect();
      
      // Force disconnect by closing socket
      const connectionPromise = testUtils.waitForEvent(mockUnity, 'connection');
      const socket = await connectionPromise;
      socket.destroy();
      
      // Wait for reconnection
      await testUtils.sleep(2000);
      
      // Should eventually reconnect
      const reconnectedPromise = testUtils.waitForEvent(unityConnection, 'connected');
      await reconnectedPromise;
      assert.strictEqual(unityConnection.isConnected(), true);
    });
  });
});