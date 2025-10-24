/**
 * Comprehensive test utilities and helpers
 */
import { EventEmitter } from 'events';
import { mock } from 'node:test';
import { TEST_CONFIG, TEST_MESSAGES } from './test-config.js';

/**
 * Mock Unity connection for testing
 */
export class MockUnityConnection extends EventEmitter {
  constructor(options = {}) {
    super();
    this.connected = false;
    this.shouldFail = options.shouldFail || false;
    this.delay = options.delay || 0;
    this.responses = options.responses || {};
    this.failAfter = options.failAfter || null;
    this.commandCount = 0;
  }

  async connect() {
    if (this.shouldFail) {
      throw new Error('Connection refused');
    }
    
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    this.connected = true;
    this.emit('connected');
    return this;
  }

  async disconnect() {
    this.connected = false;
    this.emit('disconnected');
  }

  async sendCommand(type, params = {}) {
    this.commandCount++;
    
    if (this.failAfter && this.commandCount > this.failAfter) {
      throw new Error('Mock connection failed after command limit');
    }

    if (!this.connected) {
      throw new Error('Not connected to Unity');
    }

    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    // Return predefined response or default
    const response = this.responses[type] || {
      id: Math.floor(Math.random() * 10000),
      name: params.name || 'MockObject',
      status: 'success'
    };

    return response;
  }

  isConnected() {
    return this.connected;
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  static assertValidResponse(response, expectedKeys = []) {
    if (!response) {
      throw new Error('Response is null or undefined');
    }

    expectedKeys.forEach(key => {
      if (!(key in response)) {
        throw new Error(`Expected key '${key}' not found in response`);
      }
    });
  }

  static assertGameObjectStructure(gameObject) {
    const requiredKeys = ['id', 'name', 'path', 'position', 'rotation', 'scale'];
    TestAssertions.assertValidResponse(gameObject, requiredKeys);
    
    // Validate position structure
    TestAssertions.assertValidResponse(gameObject.position, ['x', 'y', 'z']);
    TestAssertions.assertValidResponse(gameObject.rotation, ['x', 'y', 'z']);
    TestAssertions.assertValidResponse(gameObject.scale, ['x', 'y', 'z']);
  }

  static assertError(error, expectedMessage) {
    if (!error) {
      throw new Error('Expected error but none was thrown');
    }
    
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected error message to contain '${expectedMessage}', got: ${error.message}`);
    }
  }

  static assertTimingWithinRange(actualMs, expectedMs, toleranceMs = 100) {
    const diff = Math.abs(actualMs - expectedMs);
    if (diff > toleranceMs) {
      throw new Error(`Timing outside acceptable range. Expected: ${expectedMs}ms ±${toleranceMs}ms, got: ${actualMs}ms`);
    }
  }
}

/**
 * Test data generators
 */
export class TestDataFactory {
  static createGameObject(overrides = {}) {
    return {
      ...TEST_CONFIG.SAMPLE_GAMEOBJECT,
      ...overrides,
      id: Math.floor(Math.random() * 10000)
    };
  }

  static createCommand(type, params = {}) {
    return {
      id: Math.floor(Math.random() * 10000).toString(),
      type,
      params
    };
  }

  static createBatchCommands(count = 5, type = 'system_ping') {
    return Array.from({ length: count }, (_, i) => 
      TestDataFactory.createCommand(type, { index: i })
    );
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTracker {
  constructor() {
    this.measurements = new Map();
  }

  start(label) {
    this.measurements.set(label, { start: process.hrtime.bigint() });
  }

  end(label) {
    const measurement = this.measurements.get(label);
    if (!measurement) {
      throw new Error(`No measurement started for label: ${label}`);
    }
    
    const end = process.hrtime.bigint();
    const durationNs = end - measurement.start;
    const durationMs = Number(durationNs) / 1_000_000;
    
    measurement.duration = durationMs;
    return durationMs;
  }

  getResult(label) {
    const measurement = this.measurements.get(label);
    return measurement ? measurement.duration : null;
  }

  getAllResults() {
    const results = {};
    for (const [label, measurement] of this.measurements) {
      if (measurement.duration !== undefined) {
        results[label] = measurement.duration;
      }
    }
    return results;
  }

  clear() {
    this.measurements.clear();
  }
}

/**
 * Test environment utilities
 */
export class TestEnvironment {
  static shouldSkipTest(reason) {
    const reasons = {
      'integration': TEST_CONFIG.FLAGS.SKIP_INTEGRATION,
      'e2e': TEST_CONFIG.FLAGS.SKIP_E2E,
      'ci': TEST_CONFIG.FLAGS.CI_MODE,
      'unity': !TestEnvironment.isUnityRunning()
    };

    return reasons[reason] || false;
  }

  static isUnityRunning() {
    // This would need to be implemented to actually check Unity connection
    return !TEST_CONFIG.FLAGS.CI_MODE;
  }

  static getSkipMessage(reason) {
    const messages = {
      'integration': TEST_MESSAGES.SKIPPED.INTEGRATION,
      'e2e': TEST_MESSAGES.SKIPPED.E2E,
      'unity': TEST_MESSAGES.SKIPPED.UNITY_NOT_RUNNING,
      'ci': TEST_MESSAGES.SKIPPED.LONG_RUNNING
    };

    return messages[reason] || 'Test skipped';
  }

  static async withTimeout(promise, timeoutMs = TEST_CONFIG.TIMING.MEDIUM_TIMEOUT) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Test timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  static async retry(fn, maxRetries = TEST_CONFIG.TIMING.MAX_RETRIES) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.TIMING.RETRY_DELAY));
        }
      }
    }
    
    throw lastError;
  }
}

/**
 * Factory function to create mock Unity connection with mocked methods
 */
export function createMockUnityConnection(options = {}) {
  const mockConnection = {
    sendCommand: mock.fn(async () => options.sendCommandResult || {}),
    isConnected: mock.fn(() => true),
    connect: mock.fn(async () => {}),
    disconnect: mock.fn(async () => {}),
    ...options
  };
  
  return mockConnection;
}

/**
 * Unity response constants for tests
 */
export const UNITY_RESPONSES = {
  gameObject: (overrides = {}) => ({
    id: -1000,
    name: 'TestObject',
    path: '/TestObject',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    layer: 0,
    tag: 'Untagged',
    active: true,
    ...overrides
  }),
  SUCCESS: {
    success: true,
    message: 'Operation completed successfully'
  },
  ERROR: {
    success: false,
    error: 'Operation failed',
    message: 'Test error message'
  }
};

/**
 * Logging utilities for tests
 */
export class TestLogger {
  static log(message, ...args) {
    if (TEST_CONFIG.FLAGS.VERBOSE_LOGGING) {
      console.log(`[TEST] ${message}`, ...args);
    }
  }

  static error(message, ...args) {
    console.error(`[TEST ERROR] ${message}`, ...args);
  }

  static time(label) {
    if (TEST_CONFIG.FLAGS.VERBOSE_LOGGING) {
      console.time(`[TEST TIME] ${label}`);
    }
  }

  static timeEnd(label) {
    if (TEST_CONFIG.FLAGS.VERBOSE_LOGGING) {
      console.timeEnd(`[TEST TIME] ${label}`);
    }
  }
}