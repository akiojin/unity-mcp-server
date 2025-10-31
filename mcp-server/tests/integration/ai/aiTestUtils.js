import { UnityConnection } from '../../../src/core/unityConnection.js';

/**
 * Creates and establishes a Unity connection for AI integration tests.
 * Throws with a user-friendly message when Unity is not reachable.
 */
export async function createUnityConnection() {
  const connection = new UnityConnection();

  try {
    await connection.connect();
  } catch (error) {
    if (process.env.CI || process.env.UNITY_MCP_TEST_SKIP_UNITY === 'true') {
      console.warn('[AI Tests] Unity connection unavailable (CI mode). Returning null connection.');
      return null;
    }

    console.error('❌ Failed to connect to Unity for AI integration tests.');
    console.error('   1. Ensure Unity Editor is running the UnityMCPServer project.');
    console.error('   2. Confirm the MCP bridge is listening on localhost:6400.');
    throw error;
  }

  return connection;
}

/**
 * Helper to close a Unity connection if it is still active.
 */
export function safeDisconnect(connection) {
  if (connection && connection.connected) {
    connection.disconnect();
  }
}
