/**
 * Test configuration and constants
 */

export const TEST_CONFIG = {
  // Unity connection settings
  UNITY: {
    HOST: 'localhost',
    PORT: 6401,
    PORT_ALTERNATE: 6402,
    CONNECTION_TIMEOUT: 5000,
    COMMAND_TIMEOUT: 30000
  },

  // Test timing
  TIMING: {
    SHORT_TIMEOUT: 1000,
    MEDIUM_TIMEOUT: 5000,
    LONG_TIMEOUT: 30000,
    RETRY_DELAY: 100,
    MAX_RETRIES: 3
  },

  // Test data
  SAMPLE_GAMEOBJECT: {
    name: 'TestObject',
    position: { x: 1, y: 2, z: 3 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 2, y: 2, z: 2 },
    tag: 'Player',
    layer: 5
  },

  // Test flags
  FLAGS: {
    SKIP_INTEGRATION: process.env.SKIP_INTEGRATION === 'true',
    SKIP_E2E: process.env.SKIP_E2E === 'true',
    VERBOSE_LOGGING: process.env.VERBOSE_TEST === 'true',
    CI_MODE: process.env.CI === 'true'
  }
};

export const TEST_MESSAGES = {
  SKIPPED: {
    INTEGRATION: 'Integration tests skipped - set SKIP_INTEGRATION=false to enable',
    E2E: 'E2E tests skipped - set SKIP_E2E=false to enable',
    UNITY_NOT_RUNNING: 'Unity not running - skipping test',
    LONG_RUNNING: 'Long running test - skipped in CI'
  }
};
