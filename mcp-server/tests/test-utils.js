import net from 'net';
import { EventEmitter } from 'events';

/**
 * Mock Unity server for testing
 */
export class MockUnityServer extends EventEmitter {
  constructor(port = 6401) {
    super();
    this.port = port;
    this.server = null;
    this.connections = new Set();
    this.responseDelay = 0;
    this.shouldTimeout = false;
    this.responses = new Map();
  }

  async start() {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        this.connections.add(socket);
        this.emit('connection', socket);
        
        let messageBuffer = Buffer.alloc(0);

        socket.on('data', async (data) => {
          // Append new data to buffer
          messageBuffer = Buffer.concat([messageBuffer, data]);
          
          // Process complete messages
          while (messageBuffer.length >= 4) {
            // Read message length (first 4 bytes, big-endian)
            const messageLength = messageBuffer.readInt32BE(0);
            
            // Check if we have the complete message
            if (messageBuffer.length < 4 + messageLength) {
              break; // Wait for more data
            }
            
            // Extract the message
            const messageData = messageBuffer.slice(4, 4 + messageLength);
            messageBuffer = messageBuffer.slice(4 + messageLength);
            
            try {
              const request = JSON.parse(messageData.toString());
              this.emit('request', request);

              if (this.shouldTimeout) {
                // Don't respond to simulate timeout
                continue;
              }

              // Simulate processing delay
              if (this.responseDelay > 0) {
                await new Promise(r => setTimeout(r, this.responseDelay));
              }

              // Get predefined response or create default
              const response = this.responses.get(request.type) || {
                id: request.id,
                status: 'success',
                result: {
                  id: -1000 - parseInt(request.id),
                  name: request.params.name || 'TestObject',
                  path: `/${request.params.name || 'TestObject'}`,
                  position: request.params.position || { x: 0, y: 0, z: 0 },
                  rotation: request.params.rotation || { x: 0, y: 0, z: 0 },
                  scale: request.params.scale || { x: 1, y: 1, z: 1 },
                  tag: request.params.tag || 'Untagged',
                  layer: request.params.layer || 0,
                  isActive: true
                }
              };

              // Send framed response
              const responseStr = JSON.stringify(response);
              const responseBuffer = Buffer.from(responseStr, 'utf8');
              const lengthBuffer = Buffer.allocUnsafe(4);
              lengthBuffer.writeInt32BE(responseBuffer.length, 0);
              
              socket.write(Buffer.concat([lengthBuffer, responseBuffer]));
            } catch (err) {
              console.error('MockUnityServer: Error processing request:', err);
            }
          }
        });

        socket.on('close', () => {
          this.connections.delete(socket);
        });
      });

      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop() {
    // Close all connections
    for (const socket of this.connections) {
      socket.destroy();
    }
    this.connections.clear();

    // Close server
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }

  setResponse(commandType, response) {
    this.responses.set(commandType, response);
  }

  setResponseDelay(ms) {
    this.responseDelay = ms;
  }

  setTimeout(shouldTimeout) {
    this.shouldTimeout = shouldTimeout;
  }
}

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Wait for a specific event with timeout
   */
  waitForEvent: (emitter, event, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      emitter.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  },

  /**
   * Create a promise that resolves after ms
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Measure execution time
   */
  measureTime: async (fn) => {
    const start = Date.now();
    try {
      const result = await fn();
      return {
        duration: Date.now() - start,
        result,
        error: null
      };
    } catch (error) {
      return {
        duration: Date.now() - start,
        result: null,
        error
      };
    }
  }
};