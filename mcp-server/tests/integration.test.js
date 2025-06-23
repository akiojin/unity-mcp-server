import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import net from 'net';
import { UnityConnection } from '../src/core/unityConnection.js';
import { config } from '../src/core/config.js';
import { EventEmitter } from 'events';

/**
 * Integration tests for Unity-MCP communication
 * These tests simulate the actual TCP communication between Unity and the MCP server
 */
describe('Unity-MCP Integration', () => {
  let server;
  let serverPort;
  let connection;
  let clientSocket;

  // Helper to create a framed message
  function createFramedMessage(obj) {
    const json = JSON.stringify(obj);
    const messageBuffer = Buffer.from(json, 'utf8');
    const lengthBuffer = Buffer.allocUnsafe(4);
    lengthBuffer.writeInt32BE(messageBuffer.length, 0);
    return Buffer.concat([lengthBuffer, messageBuffer]);
  }

  // Helper to parse framed message
  function parseFramedMessage(buffer) {
    if (buffer.length < 4) return null;
    const length = buffer.readInt32BE(0);
    if (buffer.length < 4 + length) return null;
    const json = buffer.slice(4, 4 + length).toString('utf8');
    return JSON.parse(json);
  }

  beforeEach(async () => {
    // Create a mock Unity server
    server = net.createServer();
    
    // Start server on random port
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        resolve();
      });
    });

    // Create connection instance with test config
    connection = new UnityConnection();
    
    // Override config for testing
    connection.constructor.prototype.connect = async function() {
      return new Promise((resolve, reject) => {
        if (this.connected) {
          resolve();
          return;
        }

        this.socket = new net.Socket();
        let resolved = false;

        this.socket.on('connect', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          resolved = true;
          this.emit('connected');
          resolve();
        });

        this.socket.on('data', (data) => {
          this.handleData(data);
        });

        this.socket.on('error', (error) => {
          this.emit('error', error);
          if (!this.connected && !resolved) {
            resolved = true;
            reject(error);
          }
        });

        this.socket.on('close', () => {
          this.connected = false;
          this.socket = null;
          this.messageBuffer = Buffer.alloc(0);
          this.pendingCommands.clear();
          this.emit('disconnected');
        });

        // Connect to test server
        this.socket.connect(serverPort, '127.0.0.1');
      });
    };
  });

  afterEach(async () => {
    // Clean up connection
    if (connection && connection.isConnected()) {
      connection.disconnect();
    }

    // Close client socket if exists
    if (clientSocket) {
      clientSocket.destroy();
    }

    // Close server
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  describe('Connection Management', () => {
    it('should establish connection to Unity server', async () => {
      let serverConnection = null;

      server.on('connection', (socket) => {
        serverConnection = socket;
      });

      await connection.connect();

      assert.equal(connection.isConnected(), true);
      assert.notEqual(serverConnection, null);
    });

    it('should handle connection rejection', async () => {
      // Create a new server that rejects connections
      const rejectServer = net.createServer((socket) => {
        socket.destroy();
      });
      
      await new Promise((resolve) => {
        rejectServer.listen(0, () => resolve());
      });
      
      const rejectPort = rejectServer.address().port;
      const rejectConnection = new UnityConnection();
      
      // Temporarily override port
      const originalPort = config.unity.port;
      config.unity.port = rejectPort;
      
      try {
        await assert.rejects(
          rejectConnection.connect(),
          /ECONNRESET|Connection closed|Connection timeout/
        );
      } finally {
        config.unity.port = originalPort;
        rejectServer.close();
      }
    });
  });

  describe('Command-Response Flow', () => {
    beforeEach(async () => {
      server.on('connection', (socket) => {
        clientSocket = socket;
        
        // Echo server - responds to commands
        let buffer = Buffer.alloc(0);
        
        socket.on('data', (data) => {
          buffer = Buffer.concat([buffer, data]);
          
          while (buffer.length >= 4) {
            const length = buffer.readInt32BE(0);
            if (buffer.length >= 4 + length) {
              const messageData = buffer.slice(4, 4 + length);
              buffer = buffer.slice(4 + length);
              
              try {
                const command = JSON.parse(messageData.toString('utf8'));
                
                // Simulate Unity's response
                let response;
                switch (command.type) {
                  case 'ping':
                    response = {
                      id: command.id,
                      status: 'success',
                      result: {
                        message: 'pong',
                        timestamp: new Date().toISOString()
                      }
                    };
                    break;
                  case 'error-test':
                    response = {
                      id: command.id,
                      status: 'error',
                      error: 'Test error message'
                    };
                    break;
                  default:
                    response = {
                      id: command.id,
                      status: 'success',
                      result: { echo: command.params }
                    };
                }
                
                socket.write(createFramedMessage(response));
              } catch (e) {
                // Not JSON, might be Unity log
              }
            } else {
              break;
            }
          }
        });
      });

      await connection.connect();
    });

    it('should send command and receive response', async () => {
      const result = await connection.sendCommand('test', { data: 'hello' });
      assert.deepEqual(result, { echo: { data: 'hello' } });
    });

    it('should handle ping command', async () => {
      const result = await connection.ping();
      assert.equal(result.message, 'pong');
      assert.ok(result.timestamp);
    });

    it('should handle error responses', async () => {
      await assert.rejects(
        connection.sendCommand('error-test'),
        /Test error message/
      );
    });

    it('should handle multiple concurrent commands', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          connection.sendCommand('concurrent', { index: i })
        );
      }

      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        assert.deepEqual(result, { echo: { index } });
      });
    });
  });

  describe('Unity Debug Logs Handling', () => {
    beforeEach(async () => {
      server.on('connection', (socket) => {
        clientSocket = socket;
        let messageBuffer = Buffer.alloc(0);
        
        // Simulate Unity sending debug logs mixed with responses
        socket.on('data', (data) => {
          messageBuffer = Buffer.concat([messageBuffer, data]);
          
          // Try to parse complete messages
          while (messageBuffer.length >= 4) {
            const length = messageBuffer.readInt32BE(0);
            if (messageBuffer.length < 4 + length) break;
            
            const json = messageBuffer.slice(4, 4 + length).toString('utf8');
            messageBuffer = messageBuffer.slice(4 + length);
            
            try {
              const command = JSON.parse(json);
              // Send Unity debug log first (improperly framed)
              const debugLog = '[Unity Editor MCP] Processing command: ' + command.type;
              socket.write(Buffer.from(debugLog)); // No framing!
              
              // Then send proper response
              const response = {
                id: command.id,
                status: 'success',
                result: { processed: true }
              };
              socket.write(createFramedMessage(response));
            } catch (e) {
              // Ignore parse errors
            }
          }
        });
      });

      await connection.connect();
    });

    it('should handle Unity debug logs mixed with valid responses', async () => {
      const result = await connection.sendCommand('test-with-logs');
      assert.deepEqual(result, { processed: true });
    });
  });

  describe('Message Fragmentation', () => {
    beforeEach(async () => {
      server.on('connection', (socket) => {
        clientSocket = socket;
        let messageBuffer = Buffer.alloc(0);
        
        socket.on('data', (data) => {
          messageBuffer = Buffer.concat([messageBuffer, data]);
          
          // Try to parse complete messages
          while (messageBuffer.length >= 4) {
            const length = messageBuffer.readInt32BE(0);
            if (messageBuffer.length < 4 + length) break;
            
            const json = messageBuffer.slice(4, 4 + length).toString('utf8');
            messageBuffer = messageBuffer.slice(4 + length);
            
            try {
              const command = JSON.parse(json);
              const response = {
                id: command.id,
                status: 'success',
                result: { 
                  largeData: 'x'.repeat(1000), // Large response
                  command: command.type 
                }
              };
              
              const framedResponse = createFramedMessage(response);
              
              // Send response in chunks
              const chunkSize = 50;
              for (let i = 0; i < framedResponse.length; i += chunkSize) {
                setTimeout(() => {
                  socket.write(framedResponse.slice(i, i + chunkSize));
                }, i / chunkSize * 10); // Delay each chunk
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        });
      });

      await connection.connect();
    });

    it('should handle fragmented responses', async () => {
      const result = await connection.sendCommand('fragmented-test');
      assert.equal(result.command, 'fragmented-test');
      assert.equal(result.largeData.length, 1000);
    });
  });

  describe('Connection Recovery', () => {
    it('should handle server disconnect gracefully', async () => {
      let disconnected = false;
      
      server.on('connection', (socket) => {
        clientSocket = socket;
        
        // Disconnect after 100ms
        setTimeout(() => {
          socket.destroy();
        }, 100);
      });

      connection.on('disconnected', () => {
        disconnected = true;
      });

      await connection.connect();
      
      // Wait for disconnect
      await new Promise(resolve => setTimeout(resolve, 200));
      
      assert.equal(disconnected, true);
      assert.equal(connection.isConnected(), false);
    });

    it('should clear pending commands on disconnect', async () => {
      server.on('connection', (socket) => {
        clientSocket = socket;
        
        // Don't respond, just disconnect
        socket.on('data', () => {
          socket.destroy();
        });
      });

      await connection.connect();
      
      await assert.rejects(
        connection.sendCommand('will-disconnect'),
        /Connection closed|ECONNRESET|socket hang up|Command .* timed out|Command timeout/
      );
      
      assert.equal(connection.pendingCommands.size, 0);
    });
  });

  describe('Invalid Message Handling', () => {
    beforeEach(async () => {
      server.on('connection', (socket) => {
        clientSocket = socket;
      });

      await connection.connect();
    });

    it('should handle invalid frame length', async () => {
      // Send invalid length header
      const invalidLength = Buffer.allocUnsafe(4);
      invalidLength.writeInt32BE(-1, 0);
      clientSocket.write(invalidLength);
      
      // Follow with valid message
      const response = {
        id: '1',
        status: 'success',
        result: { recovered: true }
      };
      clientSocket.write(createFramedMessage(response));

      // Set up pending command
      const promise = new Promise((resolve, reject) => {
        connection.pendingCommands.set('1', { resolve, reject });
      });

      const result = await promise;
      assert.deepEqual(result, { recovered: true });
    });

    it('should handle non-JSON data', async () => {
      let messageReceived = false;
      
      connection.on('message', () => {
        messageReceived = true;
      });

      // Send non-JSON data
      const nonJson = Buffer.from('This is not JSON data');
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeInt32BE(nonJson.length, 0);
      clientSocket.write(Buffer.concat([lengthBuffer, nonJson]));

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not crash, but also should not emit message
      assert.equal(messageReceived, false);
    });
  });
});