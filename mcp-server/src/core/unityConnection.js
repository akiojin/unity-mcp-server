import net from 'net';
import { EventEmitter } from 'events';
import { config, logger } from './config.js';

/**
 * Manages TCP connection to Unity Editor
 */
export class UnityConnection extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.connected = false;
    this.connectPromise = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.commandId = 0;
    this.pendingCommands = new Map();
    this.isDisconnecting = false;
    this.messageBuffer = Buffer.alloc(0);
    // Simple concurrency limiter and send queue to avoid flooding Unity
    this.sendQueue = [];
    this.inFlight = 0;
    this.maxInFlight = 1; // process one command at a time by default
    this.connectedAt = null; // Timestamp when connection was established
    this.hasConnectedOnce = false;

    // Version compatibility between Node package and Unity package
    this._versionCompatibilityChecked = false;
    this._unityPackageVersion = null;
    this._versionMismatchError = null;
  }

  /**
   * Connects to Unity Editor
   * @returns {Promise<void>}
   */
  async connect() {
    // Return the in-flight promise if we're already trying to connect.
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      // Skip connection in CI/test environments
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.CI === 'true';
      if (isTestEnv && process.env.UNITY_MCP_ALLOW_TEST_CONNECT !== '1') {
        logger.info('Skipping Unity connection in test/CI environment');
        reject(new Error('Unity connection disabled in test environment'));
        return;
      }

      const targetHost = config.unity.mcpHost || 'localhost';
      console.error(
        `[unity-mcp-server] Unity TCP connecting to ${targetHost}:${config.unity.port}...`
      );
      logger.info(`Connecting to Unity at ${targetHost}:${config.unity.port}...`);

      this.socket = new net.Socket();
      try {
        this.socket.setKeepAlive(true, 5000);
      } catch {}
      let connectionTimeout = null;
      let resolved = false;
      const settle = (fn, value) => {
        if (resolved) return;
        resolved = true;
        clearConnectionTimeout();
        this.connectPromise = null;
        fn(value);
      };

      // Helper to clean up the connection timeout
      const clearConnectionTimeout = () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
      };

      // Set up event handlers
      this.socket.on('connect', () => {
        this.connectedAt = Date.now();
        console.error(
          `[unity-mcp-server] Unity TCP connected to ${targetHost}:${config.unity.port}`
        );
        logger.info(`Connected to Unity Editor at ${targetHost}:${config.unity.port}`);
        this.connected = true;
        this.reconnectAttempts = 0;
        this.connectPromise = null;
        this.hasConnectedOnce = true;
        this.emit('connected');
        this._pumpQueue(); // flush any queued commands that arrived during reconnect
        settle(resolve);
      });

      this.socket.on('end', () => {
        // Unity closed the connection (FIN received)
        const duration = this.connectedAt ? Date.now() - this.connectedAt : 0;
        console.error(
          `[unity-mcp-server] Unity TCP connection ended by remote (FIN received, duration: ${duration}ms)`
        );
        logger.info(`Unity closed connection (FIN received) after ${duration}ms`);
        // Treat end as close to trigger reconnection
        this.socket.destroy();
      });

      this.socket.on('data', data => {
        this.handleData(data);
      });

      this.socket.on('error', error => {
        console.error(`[unity-mcp-server] Unity TCP error: ${error.message}`);
        logger.error('Socket error:', error.message);
        if (this.listenerCount('error') > 0) {
          this.emit('error', error);
        }

        if (!this.connected && !resolved) {
          this.connectPromise = null;
          // Mark as disconnecting to prevent reconnection
          this.isDisconnecting = true;
          // Destroy the socket to clean up properly
          this.socket.destroy();
          this.isDisconnecting = false;
          reject(wrapUnityConnectError(error, targetHost, config.unity.port));
        } else if (this.connected) {
          // Force close to trigger reconnect logic
          try {
            this.socket.destroy();
          } catch {}
        }
      });

      this.socket.on('close', () => {
        // Clear the connection timeout when socket closes
        clearConnectionTimeout();
        this.connectPromise = null;

        // Check if we're already handling disconnection
        if (this.isDisconnecting || !this.socket) {
          console.error(`[unity-mcp-server] Unity TCP close event (already disconnecting)`);
          return;
        }

        const duration = this.connectedAt ? Date.now() - this.connectedAt : 0;
        console.error(`[unity-mcp-server] Unity TCP disconnected (duration: ${duration}ms)`);
        logger.info(`Disconnected from Unity Editor after ${duration}ms`);
        this.connected = false;
        this.connectedAt = null;
        this.socket = null;

        // Clear message buffer
        this.messageBuffer = Buffer.alloc(0);

        // Clear pending commands
        for (const [, pending] of this.pendingCommands) {
          pending.reject(new Error('Connection closed'));
        }
        this.pendingCommands.clear();

        // Emit disconnected event
        this.emit('disconnected');

        // Attempt reconnection only if not intentionally disconnecting
        if (!this.isDisconnecting && process.env.DISABLE_AUTO_RECONNECT !== 'true') {
          this.scheduleReconnect();
        }
      });

      // Attempt connection
      this.socket.connect(config.unity.port, targetHost);

      // Set timeout for initial connection
      connectionTimeout = setTimeout(() => {
        if (!this.connected && !resolved && this.socket) {
          // Remove event listeners before destroying to prevent callbacks after timeout
          this.socket.removeAllListeners();
          this.socket.destroy();
          this.connectPromise = null;
          const timeoutError = new Error('Connection timeout');
          timeoutError.code = 'ETIMEDOUT';
          settle(reject, wrapUnityConnectError(timeoutError, targetHost, config.unity.port));
        }
      }, config.unity.connectTimeout ?? config.unity.commandTimeout);
    });
    return this.connectPromise;
  }

  /**
   * Disconnects from Unity Editor
   */
  disconnect() {
    this.isDisconnecting = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      try {
        // Remove all listeners before destroying to prevent async callbacks
        this.socket.removeAllListeners();
        this.socket.destroy();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.socket = null;
    }

    this.connected = false;
    this.isDisconnecting = false;
  }

  /**
   * Schedules a reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }
    // Avoid piling up reconnects if a connection attempt is already in progress
    if (this.connectPromise) {
      logger.info('Reconnect skipped; connection attempt already in progress');
      return;
    }

    const delay = Math.min(
      config.unity.reconnectDelay *
        Math.pow(config.unity.reconnectBackoffMultiplier, this.reconnectAttempts),
      config.unity.maxReconnectDelay
    );

    logger.info(`Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.connect().catch(error => {
        logger.error('Reconnection failed:', error.message);
      });
    }, delay);
  }

  /**
   * Handles incoming data from Unity
   * @param {Buffer} data
   */
  handleData(data) {
    // Log received data size for debugging connection issues
    console.error(`[unity-mcp-server] Received ${data.length} bytes from Unity`);

    // Fast-path: accept single unframed JSON message (NDJSON style) from tests/clients
    if (!this.messageBuffer.length) {
      const asString = data.toString('utf8').trim();
      if (asString.startsWith('{')) {
        try {
          const obj = JSON.parse(asString);
          this._processResponseObject(obj);
          return;
        } catch {
          // fall through to framed parsing
        }
      }
    }
    // Check if this is an unframed Unity debug log
    if (data.length > 0 && !this.messageBuffer.length) {
      const dataStr = data.toString('utf8');
      if (dataStr.startsWith('[unity-mcp-server]') || dataStr.startsWith('[Unity]')) {
        logger.debug(`[Unity] Received unframed debug log: ${dataStr.trim()}`);
        // Don't process unframed logs as messages
        return;
      }
    }

    // Append new data to buffer
    this.messageBuffer = Buffer.concat([this.messageBuffer, data]);

    // Process complete messages
    while (this.messageBuffer.length >= 4) {
      // Read message length (first 4 bytes, big-endian)
      const messageLength = this.messageBuffer.readInt32BE(0);

      // Validate message length
      if (messageLength < 0 || messageLength > 1024 * 1024) {
        // Max 1MB messages
        logger.error(`[Unity] Invalid message length: ${messageLength}`);

        // Try to recover by looking for valid framed message
        // Look for a reasonable length value (positive, less than 10KB for typical responses)
        let recoveryIndex = -1;
        for (let i = 4; i < Math.min(this.messageBuffer.length - 4, 100); i++) {
          const testLength = this.messageBuffer.readInt32BE(i);
          if (testLength > 0 && testLength < 10240) {
            // Check if this could be a valid JSON message
            if (i + 4 + testLength <= this.messageBuffer.length) {
              const testData = this.messageBuffer.slice(i + 4, i + 4 + testLength).toString('utf8');
              if (testData.trim().startsWith('{')) {
                recoveryIndex = i;
                break;
              }
            }
          }
        }

        if (recoveryIndex > 0) {
          logger.warning(`[Unity] Discarding ${recoveryIndex} bytes of invalid data`);
          this.messageBuffer = this.messageBuffer.slice(recoveryIndex);
          continue;
        } else {
          // Can't recover, clear buffer
          logger.error('[Unity] Unable to recover from invalid frame, clearing buffer');
          this.messageBuffer = Buffer.alloc(0);
          break;
        }
      }

      // Check if we have the complete message
      if (this.messageBuffer.length >= 4 + messageLength) {
        // Extract message
        const messageData = this.messageBuffer.slice(4, 4 + messageLength);
        this.messageBuffer = this.messageBuffer.slice(4 + messageLength);

        // Process the message
        try {
          const message = messageData.toString('utf8');

          // Skip non-JSON messages (like debug logs)
          if (!message.trim().startsWith('{')) {
            logger.warning(`[Unity] Skipping non-JSON message: ${message.substring(0, 50)}...`);
            continue;
          }

          logger.debug(`[Unity] Received framed message (length=${message.length})`);

          const response = JSON.parse(message);
          this._processResponseObject(response);
        } catch (error) {
          logger.error('[Unity] Failed to parse response:', error.message);
          logger.debug(`[Unity] Raw message: ${messageData.toString().substring(0, 200)}...`);

          // Check if this looks like a Unity log message
          const messageStr = messageData.toString();
          if (messageStr.includes('[unity-mcp-server]')) {
            logger.debug('[Unity] Received Unity log message instead of JSON response');
            // Don't treat this as a critical error
          }
        }
      } else {
        // Not enough data yet, wait for more
        break;
      }
    }
  }

  /**
   * Sends a command to Unity
   * @param {string} type - Command type
   * @param {object} params - Command parameters
   * @returns {Promise<any>} - Response from Unity
   */
  async sendCommand(type, params = {}) {
    if (this._versionMismatchError) {
      throw this._versionMismatchError;
    }

    logger.info(`[Unity] enqueue sendCommand: ${type}`, { connected: this.connected });

    if (!this.connected) {
      logger.warning('[Unity] Not connected; waiting for reconnection before sending command');
      await this.ensureConnected({
        timeoutMs: config.unity.connectTimeout ?? config.unity.commandTimeout
      });
    }

    // Create an external promise that will resolve when Unity responds
    return new Promise((outerResolve, outerReject) => {
      const task = { type, params, outerResolve, outerReject };
      this.sendQueue.push(task);
      this._pumpQueue();
    });
  }

  _pumpQueue() {
    if (!this.connected) return;
    if (this.inFlight >= this.maxInFlight) return;

    if (this._versionMismatchError) {
      const err = this._versionMismatchError;
      while (this.sendQueue.length) {
        const task = this.sendQueue.shift();
        try {
          task.outerReject(err);
        } catch {}
      }
      return;
    }

    const task = this.sendQueue.shift();
    if (!task) return;

    const id = String(++this.commandId);
    const command = { id, type: task.type, params: task.params };
    const json = JSON.stringify(command);
    const messageBuffer = Buffer.from(json, 'utf8');
    const lengthBuffer = Buffer.allocUnsafe(4);
    lengthBuffer.writeInt32BE(messageBuffer.length, 0);
    const framedMessage = Buffer.concat([lengthBuffer, messageBuffer]);

    this.inFlight++;
    logger.info(`[Unity] Dispatching command ${id}: ${task.type}`);

    // Set up timeout only when actually dispatched
    const timeout = setTimeout(() => {
      logger.error(`[Unity] Command ${id} timed out after ${config.unity.commandTimeout}ms`);
      this.pendingCommands.delete(id);
      this.inFlight = Math.max(0, this.inFlight - 1);
      task.outerReject(new Error('Command timeout'));
      this._pumpQueue();
    }, config.unity.commandTimeout);

    // Store pending with wrappers to manage queue progression
    this.pendingCommands.set(id, {
      resolve: data => {
        logger.info(`[Unity] Command ${id} resolved`);
        clearTimeout(timeout);
        try {
          task.outerResolve(data);
        } finally {
          this.inFlight = Math.max(0, this.inFlight - 1);
          this._pumpQueue();
        }
      },
      reject: error => {
        logger.error(`[Unity] Command ${id} rejected: ${error.message}`);
        clearTimeout(timeout);
        try {
          task.outerReject(error);
        } finally {
          this.inFlight = Math.max(0, this.inFlight - 1);
          this._pumpQueue();
        }
      }
    });

    // Send framed message
    this.socket.write(framedMessage, error => {
      if (error) {
        logger.error(`[Unity] Failed to write command ${id}: ${error.message}`);
        clearTimeout(timeout);
        this.pendingCommands.delete(id);
        this.inFlight = Math.max(0, this.inFlight - 1);
        task.outerReject(error);
        this._pumpQueue();
      } else {
        logger.debug(`[Unity] Command ${id} written; awaiting response`);
      }
    });
  }

  _processResponseObject(response) {
    logger.debug(
      `[Unity] Parsed response id=${response?.id || 'n/a'} status=${response?.status || (response?.success === false ? 'error' : 'success')}`
    );

    this._checkVersionCompatibility(response);

    const id = response?.id != null ? String(response.id) : null;

    const hasExplicitPending = id && this.pendingCommands.has(id);
    const fallbackPendingId =
      !hasExplicitPending && this.pendingCommands.size > 0
        ? this.pendingCommands.keys().next().value
        : null;

    if (hasExplicitPending || fallbackPendingId) {
      const targetId = hasExplicitPending ? id : fallbackPendingId;
      const pending = this.pendingCommands.get(targetId);
      this.pendingCommands.delete(targetId);

      if (response.status === 'success' || response.success === true) {
        let result = response.result || response.data || {};
        if (typeof result === 'string') {
          try {
            result = JSON.parse(result);
            logger.info(`[Unity] Parsed string result as JSON:`, result);
          } catch (parseError) {
            logger.warning(`[Unity] Failed to parse result as JSON: ${parseError.message}`);
          }
        }
        const responseVersion = response?.version || response?.editorState?.version;
        if (responseVersion && result._version == null) result._version = responseVersion;
        if (response.editorState) result._editorState = response.editorState;
        if (this._versionMismatchError) {
          pending.reject(this._versionMismatchError);
        } else {
          logger.info(`[Unity] Command ${targetId} resolved successfully`);
          pending.resolve(result);
        }
      } else if (response.status === 'error' || response.success === false) {
        logger.error(`[Unity] Command ${targetId} failed:`, response.error);
        const err = new Error(response.error || 'Command failed');
        err.code = response.code;
        pending.reject(err);
      } else {
        logger.warning(`[Unity] Command ${targetId} has unknown response format`);
        pending.resolve(response);
      }
      return;
    }

    // Unsolicited message
    logger.debug(`[Unity] Received unsolicited message id=${response?.id || 'n/a'}`);
    this.emit('message', response);
  }

  _checkVersionCompatibility(response) {
    if (this._versionCompatibilityChecked) return;

    const policy = String(config?.compat?.versionMismatch || 'warn')
      .trim()
      .toLowerCase();
    if (policy === 'off') {
      this._versionCompatibilityChecked = true;
      return;
    }

    const unityVersionRaw = response?.version ?? response?.editorState?.version;
    if (typeof unityVersionRaw !== 'string') return;
    const unityVersion = unityVersionRaw.trim();
    if (!unityVersion || unityVersion.toLowerCase() === 'unknown') return;

    const nodeVersion = String(config?.server?.version || '').trim();
    if (!nodeVersion || nodeVersion.toLowerCase() === 'unknown') {
      this._versionCompatibilityChecked = true;
      return;
    }

    this._unityPackageVersion = unityVersion;
    this._versionCompatibilityChecked = true;

    if (unityVersion === nodeVersion) return;

    const message =
      `Version mismatch detected: Node package v${nodeVersion} != Unity package v${unityVersion}. ` +
      `Update @akiojin/unity-mcp-server or the Unity UPM package so they match.`;

    if (policy === 'error') {
      const err = new Error(message);
      err.code = 'UNITY_VERSION_MISMATCH';
      this._versionMismatchError = err;
      logger.error(message);
    } else {
      logger.warning(`${message} (Set UNITY_MCP_VERSION_MISMATCH=error to fail fast.)`);
    }
  }

  /**
   * Sends a ping command to Unity
   * @returns {Promise<any>}
   */
  async ping() {
    // Use normal command sending for ping with proper framing
    return this.sendCommand('ping', {});
  }

  /**
   * Wait until the connection is available, attempting to reconnect if needed.
   * @param {object} options
   * @param {number} options.timeoutMs - Maximum time to wait for reconnection
   */
  async ensureConnected({ timeoutMs = config.unity.commandTimeout } = {}) {
    const start = Date.now();
    let lastError = null;

    while (!this.connected && Date.now() - start < timeoutMs) {
      try {
        await this.connect();
      } catch (error) {
        lastError = error;
        const msg = error?.message || '';
        if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
          // In test/CI we bail out immediately to avoid long waits
          throw error;
        }
        if (/test environment/i.test(msg)) {
          throw error;
        }
        if (
          !this.hasConnectedOnce &&
          (error?.code === 'UNITY_CONNECTION_REFUSED' || error?.code === 'ECONNREFUSED')
        ) {
          // Fail fast for the initial connection when Unity isn't listening.
          throw error;
        }
      }

      if (this.connected) return;
      await sleep(Math.min(500, timeoutMs));
    }

    if (!this.connected) {
      const targetHost = config.unity.mcpHost || 'localhost';
      const error = new Error(
        `Failed to connect to Unity at ${targetHost}:${config.unity.port} within ${timeoutMs}ms${lastError ? `: ${lastError.message}` : ''}`
      );
      error.code = 'UNITY_RECONNECT_TIMEOUT';
      throw error;
    }
  }

  /**
   * Checks if connected to Unity
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms || 0)));
}

function wrapUnityConnectError(error, host, port) {
  const code = error?.code || '';
  if (code === 'ECONNREFUSED') {
    const hint = buildUnityConnectionHint(host, port);
    const wrapped = new Error(
      `Unity TCP connection refused (ECONNREFUSED) at ${host}:${port}. ${hint}`
    );
    wrapped.code = 'UNITY_CONNECTION_REFUSED';
    wrapped.cause = error;
    return wrapped;
  }
  if (code === 'ETIMEDOUT') {
    const hint = buildUnityConnectionHint(host, port);
    const wrapped = new Error(`Unity TCP Connection timeout at ${host}:${port}. ${hint}`);
    wrapped.code = 'UNITY_CONNECTION_TIMEOUT';
    wrapped.cause = error;
    return wrapped;
  }
  return error;
}

function buildUnityConnectionHint(_host, _port) {
  return (
    `Start Unity Editor and ensure the Unity MCP package is running (TCP listener). ` +
    `Check UNITY_MCP_MCP_HOST / UNITY_MCP_PORT (Node) and UNITY_MCP_UNITY_HOST / UNITY_MCP_PORT (Unity). ` +
    `If using WSL2/Docker → Windows Unity, set UNITY_MCP_MCP_HOST=host.docker.internal.`
  );
}
