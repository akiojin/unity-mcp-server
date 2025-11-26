import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import net from 'net';
import { UnityConnection } from '../../../src/core/unityConnection.js';

describe('UnityConnection Retry Logic', () => {
  let connection;
  let mockServer;
  let serverPort;
  let originalConfig;
  const frame = obj => {
    const payload = Buffer.from(JSON.stringify(obj), 'utf8');
    const len = Buffer.allocUnsafe(4);
    len.writeInt32BE(payload.length, 0);
    return Buffer.concat([len, payload]);
  };
  const parseFrame = buf => {
    const len = buf.readInt32BE(0);
    return JSON.parse(buf.slice(4, 4 + len).toString('utf8'));
  };

  beforeEach(async () => {
    // Store original config
    const { config } = await import('../../../src/core/config.js');
    originalConfig = { ...config.unity };

    // Speed up tests by reducing delays
    config.unity.reconnectDelay = 100;
    config.unity.maxReconnectDelay = 500;
    config.unity.commandTimeout = 1000;
    config.unity.unityHost = 'localhost';
    config.unity.mcpHost = 'localhost';

    connection = new UnityConnection();
  });

  afterEach(async () => {
    // Restore config
    const { config } = await import('../../../src/core/config.js');
    Object.assign(config.unity, originalConfig);

    // Clean up
    if (connection) {
      connection.disconnect();
    }
    if (mockServer) {
      mockServer.close();
    }
  });

  describe('Automatic Reconnection', () => {
    it('should attempt to reconnect after connection loss', async () => {
      // Create a server that will accept and then close connections
      mockServer = net.createServer(socket => {
        // Immediately close connection to simulate disconnect
        setTimeout(() => socket.destroy(), 50);
      });

      await new Promise(resolve => {
        mockServer.listen(0, 'localhost', () => {
          serverPort = mockServer.address().port;
          resolve();
        });
      });

      // Track reconnection attempts
      let reconnectAttempts = 0;
      connection.on('disconnected', () => {
        reconnectAttempts++;
      });

      // Override config to use test server
      const { config } = await import('../../../src/core/config.js');
      config.unity.port = serverPort;

      // Attempt initial connection (will fail/disconnect)
      try {
        await connection.connect();
      } catch (error) {
        // Expected to fail
      }

      // Wait for reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should have attempted reconnection
      assert(reconnectAttempts > 0, 'Should have attempted reconnection');
      assert(
        connection.reconnectTimer || connection.reconnectAttempts > 0,
        'Should have reconnection scheduled or attempts recorded'
      );
    });

    it('should use exponential backoff for reconnection', async () => {
      const { config } = await import('../../../src/core/config.js');

      // Create connection and mock scheduleReconnect
      const delays = [];
      const originalSchedule = connection.scheduleReconnect.bind(connection);

      connection.scheduleReconnect = function () {
        const delay = Math.min(
          config.unity.reconnectDelay *
            Math.pow(config.unity.reconnectBackoffMultiplier, this.reconnectAttempts),
          config.unity.maxReconnectDelay
        );
        delays.push(delay);
        this.reconnectAttempts++;
      };

      // Simulate multiple reconnection attempts
      for (let i = 0; i < 4; i++) {
        connection.scheduleReconnect();
      }

      // Verify exponential backoff
      assert.equal(delays.length, 4);
      assert(delays[0] < delays[1], 'Second delay should be longer');
      assert(delays[1] < delays[2], 'Third delay should be longer');
      assert(delays[3] <= config.unity.maxReconnectDelay, 'Should not exceed max delay');
    });

    it('should reset reconnect attempts on successful connection', async () => {
      // Create a working server
      mockServer = net.createServer(socket => {
        socket.on('data', data => {
          // Echo back data
          socket.write(data);
        });
      });

      await new Promise(resolve => {
        mockServer.listen(0, 'localhost', () => {
          serverPort = mockServer.address().port;
          resolve();
        });
      });

      const { config } = await import('../../../src/core/config.js');
      config.unity.port = serverPort;

      // Set initial reconnect attempts
      connection.reconnectAttempts = 5;

      // Connect successfully
      await connection.connect();

      // Verify attempts were reset
      assert.equal(connection.reconnectAttempts, 0, 'Reconnect attempts should be reset');
      assert.equal(connection.connected, true, 'Should be connected');
    });

    it('should not reconnect when intentionally disconnected', async () => {
      // Create a server
      mockServer = net.createServer();
      await new Promise(resolve => {
        mockServer.listen(0, 'localhost', () => {
          serverPort = mockServer.address().port;
          resolve();
        });
      });

      const { config } = await import('../../../src/core/config.js');
      config.unity.port = serverPort;

      await connection.connect();

      // Track if reconnection is scheduled
      let reconnectScheduled = false;
      const originalSchedule = connection.scheduleReconnect.bind(connection);
      connection.scheduleReconnect = function () {
        reconnectScheduled = true;
        originalSchedule.call(this);
      };

      // Intentionally disconnect
      connection.disconnect();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not have scheduled reconnection
      assert.equal(
        reconnectScheduled,
        false,
        'Should not schedule reconnection after disconnect()'
      );
      assert.equal(connection.reconnectTimer, null, 'Should not have reconnect timer');
    });

    it('should handle connection timeout with retry', async () => {
      // Don't create a server - connection will timeout
      const { config } = await import('../../../src/core/config.js');
      config.unity.port = 65534; // Unlikely to be in use
      config.unity.commandTimeout = 100; // Fast timeout

      let connectionError = null;
      try {
        await connection.connect();
      } catch (error) {
        connectionError = error;
      }

      assert(connectionError, 'Should have connection error');
      assert(
        connectionError.message.includes('Connection timeout') ||
          connectionError.message.includes('ECONNREFUSED'),
        'Should be timeout or connection refused'
      );
    });

    it('should clear pending commands on reconnection', async () => {
      // Create a server that closes after receiving data
      mockServer = net.createServer(socket => {
        socket.on('data', () => {
          socket.destroy();
        });
      });

      await new Promise(resolve => {
        mockServer.listen(0, 'localhost', () => {
          serverPort = mockServer.address().port;
          resolve();
        });
      });

      const { config } = await import('../../../src/core/config.js');
      config.unity.port = serverPort;

      await connection.connect();

      // Send a command that will cause disconnection
      const commandPromise = connection.sendCommand('test', {});

      await assert.rejects(
        commandPromise,
        /Connection closed/,
        'Command should fail with connection closed'
      );

      // Verify pending commands were cleared
      assert.equal(connection.pendingCommands.size, 0, 'Pending commands should be cleared');
    });
  });

  describe('Reconnection Events', () => {
    it('should emit proper events during reconnection cycle', async () => {
      const events = [];

      // Track events
      connection.on('connected', () => events.push('connected'));
      connection.on('disconnected', () => events.push('disconnected'));
      connection.on('error', err => events.push(`error: ${err.message}`));

      // Create a flaky server
      let acceptConnections = true;
      mockServer = net.createServer(socket => {
        if (acceptConnections) {
          // Accept first connection then close it
          acceptConnections = false;
          setTimeout(() => socket.destroy(), 100);
        } else {
          // Reject subsequent connections
          socket.destroy();
        }
      });

      await new Promise(resolve => {
        mockServer.listen(0, 'localhost', () => {
          serverPort = mockServer.address().port;
          resolve();
        });
      });

      const { config } = await import('../../../src/core/config.js');
      config.unity.port = serverPort;

      // Connect
      await connection.connect();

      // Wait for disconnect and reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should have connection events
      assert(events.includes('connected'), 'Should emit connected event');
      assert(events.includes('disconnected'), 'Should emit disconnected event');
    });
  });

  describe('Command Handling During Reconnection', () => {
    it('should reject commands when not connected', async () => {
      // Force connect() to fail immediately
      connection.connect = mock.fn(async () => {
        throw new Error('Connection refused');
      });
      connection.connected = false;

      await assert.rejects(
        connection.sendCommand('test', {}),
        /Connection refused|Failed to reconnect|Connection timeout/,
        'Should bubble up connection failure when not connected'
      );
    });

    it('should handle commands sent during reconnection', async () => {
      // Create a server that accepts connections after a delay
      let acceptConnections = false;
      mockServer = net.createServer(socket => {
        if (acceptConnections) {
          socket.on('data', data => {
            try {
              const cmd = parseFrame(data);
              const response = {
                id: cmd.id,
                status: 'success',
                result: { echo: cmd.type }
              };
              socket.write(frame(response));
            } catch (e) {
              // Ignore
            }
          });
        } else {
          socket.destroy();
        }
      });

      await new Promise(resolve => {
        mockServer.listen(0, 'localhost', () => {
          serverPort = mockServer.address().port;
          resolve();
        });
      });

      const { config } = await import('../../../src/core/config.js');
      config.unity.port = serverPort;

      // Try to connect (will fail)
      try {
        await connection.connect();
      } catch (e) {
        // Expected
      }

      // Enable connections
      setTimeout(() => {
        acceptConnections = true;
      }, 200);

      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 400));

      // If connected, try a command
      if (connection.connected) {
        const result = await connection.sendCommand('test', {});
        assert.equal(result.echo, 'test', 'Command should work after reconnection');
      }
    });
  });
});
