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

        socket.on('data', async (data) => {
          const request = JSON.parse(data.toString());
          this.emit('request', request);

          if (this.shouldTimeout) {
            // Don't respond to simulate timeout
            return;
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
              id: -1000,
              name: request.params.name || 'TestObject',
              path: `/${request.params.name || 'TestObject'}`,
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
              tag: 'Untagged',
              layer: 0,
              isActive: true
            }
          };

          socket.write(JSON.stringify(response) + '\n');
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