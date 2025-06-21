import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'net';
import { UnityConnection } from './unityConnection.js';

describe('Integration Tests', () => {
  let mockUnityServer;
  let serverPort;

  before(async () => {
    // Create a mock Unity TCP server
    mockUnityServer = net.createServer((socket) => {
      socket.on('data', (data) => {
        const message = data.toString();
        
        // Handle ping
        if (message === 'ping') {
          const response = JSON.stringify({
            status: 'success',
            data: {
              message: 'pong',
              timestamp: new Date().toISOString()
            }
          });
          socket.write(response);
          return;
        }

        // Handle JSON commands
        try {
          const command = JSON.parse(message);
          const response = {
            id: command.id,
            status: 'success',
            data: {
              echo: command.type,
              params: command.params
            }
          };
          socket.write(JSON.stringify(response));
        } catch (e) {
          const errorResponse = {
            status: 'error',
            error: 'Invalid command format'
          };
          socket.write(JSON.stringify(errorResponse));
        }
      });
    });

    // Start server on random port
    await new Promise((resolve) => {
      mockUnityServer.listen(0, 'localhost', () => {
        serverPort = mockUnityServer.address().port;
        resolve();
      });
    });
  });

  after(() => {
    mockUnityServer.close();
  });

  describe('Unity Connection Integration', () => {
    it('should connect to Unity server', async () => {
      const connection = new UnityConnection();
      
      // Override port for test
      connection.socket = new net.Socket();
      connection.socket.connect(serverPort, 'localhost');
      
      await new Promise((resolve, reject) => {
        connection.socket.on('connect', () => {
          connection.connected = true;
          resolve();
        });
        connection.socket.on('error', reject);
      });

      assert.equal(connection.connected, true);
      connection.disconnect();
    });

    it('should send and receive ping', async () => {
      const connection = new UnityConnection();
      
      // Connect to mock server
      connection.socket = new net.Socket();
      await new Promise((resolve, reject) => {
        connection.socket.on('connect', () => {
          connection.connected = true;
          resolve();
        });
        connection.socket.on('error', reject);
        connection.socket.connect(serverPort, 'localhost');
      });

      // Send ping
      const pingPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 1000);
        
        connection.socket.on('data', (data) => {
          clearTimeout(timeout);
          try {
            const response = JSON.parse(data.toString());
            resolve(response);
          } catch (e) {
            reject(e);
          }
        });
        
        connection.socket.write('ping');
      });

      const response = await pingPromise;
      assert.equal(response.status, 'success');
      assert.equal(response.data.message, 'pong');
      assert(response.data.timestamp);

      connection.disconnect();
    });

    it('should send and receive commands', async () => {
      const connection = new UnityConnection();
      
      // Connect to mock server
      connection.socket = new net.Socket();
      await new Promise((resolve, reject) => {
        connection.socket.on('connect', () => {
          connection.connected = true;
          resolve();
        });
        connection.socket.on('error', reject);
        connection.socket.connect(serverPort, 'localhost');
      });

      // Set up data handler
      connection.socket.on('data', (data) => {
        connection.handleData(data);
      });

      // Send command
      const result = await connection.sendCommand('test-command', { value: 42 });
      
      assert.equal(result.echo, 'test-command');
      assert.deepEqual(result.params, { value: 42 });

      connection.disconnect();
    });
  });
});