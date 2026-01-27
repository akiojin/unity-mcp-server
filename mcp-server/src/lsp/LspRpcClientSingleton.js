import { LspRpcClient } from './LspRpcClient.js';
import { logger } from '../core/config.js';

/**
 * Singleton manager for LspRpcClient instances.
 * Maintains one client per projectRoot to enable process reuse and improve performance.
 */

let instance = null;
let currentProjectRoot = null;
let heartbeatTimer = null;

export class LspRpcClientSingleton {
  /**
   * Get or create a shared LspRpcClient instance.
   * @param {string} projectRoot - Project root path
   * @returns {Promise<LspRpcClient>} Shared client instance
   */
  static async getInstance(projectRoot) {
    // If projectRoot changed, reset the instance
    if (instance && currentProjectRoot !== projectRoot) {
      logger.info('[LspRpcClientSingleton] projectRoot changed, resetting instance');
      await LspRpcClientSingleton.reset();
    }

    if (!instance) {
      instance = new LspRpcClient(projectRoot);
      currentProjectRoot = projectRoot;
      logger.info(`[LspRpcClientSingleton] created new instance for ${projectRoot}`);
      LspRpcClientSingleton.#startHeartbeat();
    }

    return instance;
  }

  /**
   * Reset the singleton instance and stop the process.
   */
  static async reset() {
    LspRpcClientSingleton.#stopHeartbeat();
    if (instance) {
      try {
        await instance.mgr.stop();
      } catch (e) {
        logger.warning(`[LspRpcClientSingleton] error stopping: ${e.message}`);
      }
      instance = null;
      currentProjectRoot = null;
      logger.info('[LspRpcClientSingleton] instance reset');
    }
  }

  /**
   * Start heartbeat monitoring to detect dead processes.
   */
  static #startHeartbeat() {
    if (heartbeatTimer) return;
    heartbeatTimer = setInterval(async () => {
      if (!instance) return;
      // Check if process is still alive before attempting heartbeat
      if (!instance.proc || instance.proc.killed) {
        logger.warning('[LspRpcClientSingleton] process dead, resetting...');
        instance = null;
        currentProjectRoot = null;
        LspRpcClientSingleton.#stopHeartbeat();
        return;
      }
      try {
        // Lightweight ping to avoid heavy workspace scans
        await instance.request('mcp/ping', {});
      } catch (e) {
        logger.warning(`[LspRpcClientSingleton] heartbeat failed: ${e.message}, resetting...`);
        // Process is dead, reset instance for next request
        instance = null;
        currentProjectRoot = null;
        LspRpcClientSingleton.#stopHeartbeat();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat monitoring.
   */
  static #stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  /**
   * Check if an instance exists.
   * @returns {boolean}
   */
  static hasInstance() {
    return instance !== null;
  }
}
