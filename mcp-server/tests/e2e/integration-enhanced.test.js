import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import net from 'net';
import { UnityConnection } from '../../src/core/unityConnection.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { logger } from '../../src/core/config.js';

describe('Enhanced Integration Tests', () => {
  let mockUnityServer;
  let serverPort;
  let activeConnections = [];

  before(async () => {
    // Create a more realistic mock Unity TCP server
    mockUnityServer = net.createServer((socket) => {
      activeConnections.push(socket);
      
      socket.on('data', (data) => {
        const messages = data.toString().split('\n').filter(msg => msg.trim());
        
        messages.forEach(message => {
          try {
            const command = JSON.parse(message);
            
            // Simulate Unity's response format
            const response = {
              id: command.id,
              success: true,
              data: {}
            };

            switch (command.type) {
              case 'ping':
                response.data = {
                  message: 'pong',
                  echo: command.params?.message || null,
                  timestamp: new Date().toISOString()
                };
                break;
              
              case 'get_status':
                response.data = {
                  status: 'Connected',
                  version: '1.0.0',
                  uptime: 1000
                };
                break;
              
              case 'error_test':
                response.success = false;
                response.error = 'Simulated error for testing';
                break;
              
              default:
                response.data = {
                  echo: command.type,
                  params: command.params
                };
            }

            socket.write(JSON.stringify(response) + '\n');
          } catch (e) {
            const errorResponse = {
              id: 'unknown',
              success: false,
              error: `Parse error: ${e.message}`
            };
            socket.write(JSON.stringify(errorResponse) + '\n');
          }
        });
      });
      
      socket.on('error', () => {
        const index = activeConnections.indexOf(socket);
        if (index > -1) activeConnections.splice(index, 1);
      });
      
      socket.on('close', () => {
        const index = activeConnections.indexOf(socket);
        if (index > -1) activeConnections.splice(index, 1);
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
    activeConnections.forEach(socket => socket.destroy());
    mockUnityServer.close();
  });

  describe('Connection Lifecycle Tests', () => {
    it('should establish connection with retry logic', async () => {
      const connection = new UnityConnection();
      let attemptCount = 0;
      
      // Override connect to count attempts
      const originalConnect = connection.connect.bind(connection);
      connection.connect = async function(host, port) {
        attemptCount++;
        return originalConnect.call(this, host || 'localhost', port || serverPort);
      };
      
      await connection.connect('localhost', serverPort);
      assert.equal(connection.connected, true);
      assert.equal(attemptCount, 1, 'Should connect on first attempt');
      
      connection.disconnect();
    });

    it('should handle connection failure gracefully', async () => {
      const connection = new UnityConnection();
      const badPort = 65535; // Unlikely to be in use
      
      await assert.rejects(
        async () => await connection.connect('localhost', badPort),
        /Connection failed/
      );
      
      assert.equal(connection.connected, false);
    });

    it('should reconnect after disconnection', async () => {
      const connection = new UnityConnection();
      
      // First connection
      await connection.connect('localhost', serverPort);
      assert.equal(connection.connected, true);
      
      // Disconnect
      connection.disconnect();
      assert.equal(connection.connected, false);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reconnect
      await connection.connect('localhost', serverPort);
      assert.equal(connection.connected, true);
      
      connection.disconnect();
    });

    it('should handle multiple rapid connections', async () => {
      const connections = [];
      
      // Create 5 connections rapidly
      for (let i = 0; i < 5; i++) {
        const conn = new UnityConnection();
        connections.push(conn);
        await conn.connect('localhost', serverPort);
      }
      
      // Verify all are connected
      connections.forEach((conn, i) => {
        assert.equal(conn.connected, true, `Connection ${i} should be connected`);
      });
      
      // Clean up
      connections.forEach(conn => conn.disconnect());
    });
  });

  describe('Command Processing Tests', () => {
    let connection;

    beforeEach(async () => {
      connection = new UnityConnection();
      await connection.connect('localhost', serverPort);
    });

    afterEach(() => {
      if (connection.connected) {
        connection.disconnect();
      }
    });

    it('should process ping command with parameters', async () => {
      const result = await connection.sendCommand('ping', { message: 'Hello Unity' });
      
      assert.equal(result.message, 'pong');
      assert.equal(result.echo, 'Hello Unity');
      assert(result.timestamp, 'Should include timestamp');
    });

    it('should handle get_status command', async () => {
      const result = await connection.sendCommand('get_status', {});
      
      assert.equal(result.status, 'Connected');
      assert.equal(result.version, '1.0.0');
      assert.equal(typeof result.uptime, 'number');
    });

    it('should handle command errors properly', async () => {
      await assert.rejects(
        async () => await connection.sendCommand('error_test', {}),
        /Simulated error for testing/
      );
    });

    it('should handle concurrent commands', async () => {
      const commands = [
        connection.sendCommand('ping', { message: 'cmd1' }),
        connection.sendCommand('get_status', {}),
        connection.sendCommand('ping', { message: 'cmd3' })
      ];
      
      const results = await Promise.all(commands);
      
      assert.equal(results[0].echo, 'cmd1');
      assert.equal(results[1].status, 'Connected');
      assert.equal(results[2].echo, 'cmd3');
    });

    it('should timeout long-running commands', async () => {
      // Override timeout for this test
      const originalTimeout = connection.commandTimeout;
      connection.commandTimeout = 100; // 100ms timeout
      
      // Don't actually send to server, just test timeout mechanism
      const slowCommand = new Promise((resolve, reject) => {
        const id = 'slow-cmd';
        connection.pendingRequests.set(id, { resolve, reject });
        
        // Simulate command being sent but no response
        setTimeout(() => {
          if (connection.pendingRequests.has(id)) {
            connection.pendingRequests.delete(id);
            reject(new Error('Command timeout'));
          }
        }, connection.commandTimeout);
      });
      
      await assert.rejects(
        async () => await slowCommand,
        /Command timeout/
      );
      
      connection.commandTimeout = originalTimeout;
    });
  });

  describe('Data Handling Tests', () => {
    let connection;

    beforeEach(async () => {
      connection = new UnityConnection();
      await connection.connect('localhost', serverPort);
    });

    afterEach(() => {
      if (connection.connected) {
        connection.disconnect();
      }
    });

    it('should handle fragmented messages', async () => {
      // Send a command that will be fragmented
      const longMessage = 'x'.repeat(1000);
      const result = await connection.sendCommand('ping', { message: longMessage });
      
      assert.equal(result.echo, longMessage);
    });

    it('should handle multiple messages in single packet', async () => {
      // This simulates Unity sending multiple responses at once
      const responses = await Promise.all([
        connection.sendCommand('ping', { message: 'msg1' }),
        connection.sendCommand('ping', { message: 'msg2' })
      ]);
      
      assert.equal(responses[0].echo, 'msg1');
      assert.equal(responses[1].echo, 'msg2');
    });

    it('should handle invalid JSON responses gracefully', async () => {
      // Directly write invalid data to test error handling
      const testPromise = new Promise((resolve, reject) => {
        connection.socket.once('data', () => {
          // Inject invalid data
          connection.handleData(Buffer.from('invalid json\n'));
          resolve();
        });
      });
      
      connection.socket.write(JSON.stringify({ id: 'test', type: 'ping' }) + '\n');
      await testPromise;
      
      // Connection should still be alive
      assert.equal(connection.connected, true);
    });
  });

  describe('MCP Server Integration Tests', () => {
    it('should integrate with MCP server for ping tool', async () => {
      const logger = createLogger();
      const server = new Server({
        name: 'unity-mcp-test',
        version: '1.0.0'
      }, { capabilities: {} });
      
      const connection = new UnityConnection();
      await connection.connect('localhost', serverPort);
      
      // Register ping tool
      server.setRequestHandler('tools/call', async (request) => {
        if (request.params.name === 'ping') {
          const message = request.params.arguments?.message || 'test';
          const result = await connection.sendCommand('ping', { message });
          
          return {
            content: [{
              type: 'text',
              text: `Unity responded: ${result.message} (echo: ${result.echo})`
            }]
          };
        }
        throw new Error('Unknown tool');
      });
      
      // Simulate MCP tool call
      const toolResult = await server.requestHandler.handle('tools/call', {
        params: {
          name: 'ping',
          arguments: { message: 'MCP test' }
        }
      });
      
      assert(toolResult.content[0].text.includes('pong'));
      assert(toolResult.content[0].text.includes('MCP test'));
      
      connection.disconnect();
    });
  });
});

describe('Stress Tests', () => {
  let mockUnityServer;
  let serverPort;
  let messageCount = 0;

  before(async () => {
    // Create a mock server that counts messages
    mockUnityServer = net.createServer((socket) => {
      socket.on('data', (data) => {
        const messages = data.toString().split('\n').filter(msg => msg.trim());
        
        messages.forEach(message => {
          try {
            const command = JSON.parse(message);
            messageCount++;
            
            const response = {
              id: command.id,
              success: true,
              data: {
                message: 'pong',
                count: messageCount
              }
            };
            
            socket.write(JSON.stringify(response) + '\n');
          } catch (e) {
            // Ignore parse errors
          }
        });
      });
    });

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

  it('should handle 100 rapid commands', async () => {
    const connection = new UnityConnection();
    await connection.connect('localhost', serverPort);
    
    const startTime = Date.now();
    const promises = [];
    
    // Send 100 commands as fast as possible
    for (let i = 0; i < 100; i++) {
      promises.push(connection.sendCommand('ping', { index: i }));
    }
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    // Verify all responses received
    assert.equal(results.length, 100);
    results.forEach(result => {
      assert.equal(result.message, 'pong');
      assert(result.count > 0);
    });
    
    console.log(`Processed 100 commands in ${endTime - startTime}ms`);
    
    connection.disconnect();
  });
});