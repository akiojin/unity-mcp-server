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
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.commandId = 0;
    this.pendingCommands = new Map();
    this.isDisconnecting = false;
  }

  /**
   * Connects to Unity Editor
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      logger.info(`Connecting to Unity at ${config.unity.host}:${config.unity.port}...`);
      
      this.socket = new net.Socket();
      let connectionTimeout = null;
      let resolved = false;
      
      // Helper to clean up the connection timeout
      const clearConnectionTimeout = () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
      };
      
      // Set up event handlers
      this.socket.on('connect', () => {
        logger.info('Connected to Unity Editor');
        this.connected = true;
        this.reconnectAttempts = 0;
        resolved = true;
        clearConnectionTimeout();
        this.emit('connected');
        resolve();
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });

      this.socket.on('error', (error) => {
        logger.error('Socket error:', error.message);
        this.emit('error', error);
        
        if (!this.connected && !resolved) {
          resolved = true;
          clearConnectionTimeout();
          // Mark as disconnecting to prevent reconnection
          this.isDisconnecting = true;
          // Destroy the socket to clean up properly
          this.socket.destroy();
          this.isDisconnecting = false;
          reject(error);
        }
      });

      this.socket.on('close', () => {
        // Clear the connection timeout when socket closes
        clearConnectionTimeout();
        
        // Check if we're already handling disconnection
        if (this.isDisconnecting || !this.socket) {
          return;
        }
        
        logger.info('Disconnected from Unity Editor');
        this.connected = false;
        const wasSocket = this.socket;
        this.socket = null;
        
        // Clear pending commands
        for (const [id, pending] of this.pendingCommands) {
          pending.reject(new Error('Connection closed'));
        }
        this.pendingCommands.clear();
        
        // Emit disconnected event
        this.emit('disconnected');
        
        // Attempt reconnection only if not intentionally disconnecting
        if (!this.isDisconnecting) {
          this.scheduleReconnect();
        }
      });

      // Attempt connection
      this.socket.connect(config.unity.port, config.unity.host);
      
      // Set timeout for initial connection
      connectionTimeout = setTimeout(() => {
        if (!this.connected && !resolved && this.socket) {
          resolved = true;
          // Remove event listeners before destroying to prevent callbacks after timeout
          this.socket.removeAllListeners();
          this.socket.destroy();
          reject(new Error('Connection timeout'));
        }
      }, config.unity.commandTimeout);
    });
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

    const delay = Math.min(
      config.unity.reconnectDelay * Math.pow(config.unity.reconnectBackoffMultiplier, this.reconnectAttempts),
      config.unity.maxReconnectDelay
    );

    logger.info(`Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.connect().catch((error) => {
        logger.error('Reconnection failed:', error.message);
      });
    }, delay);
  }

  /**
   * Handles incoming data from Unity
   * @param {Buffer} data
   */
  handleData(data) {
    try {
      const response = JSON.parse(data.toString());
      logger.debug(`Received response: ${JSON.stringify(response)}`);
      
      // Check if this is a response to a pending command
      if (response.id && this.pendingCommands.has(response.id)) {
        const pending = this.pendingCommands.get(response.id);
        this.pendingCommands.delete(response.id);
        
        if (response.status === 'success') {
          pending.resolve(response.data || {});
        } else {
          pending.reject(new Error(response.error || 'Command failed'));
        }
      } else {
        // Handle unsolicited messages
        this.emit('message', response);
      }
    } catch (error) {
      logger.error('Failed to parse response:', error.message);
      logger.debug(`Raw data: ${data.toString()}`);
    }
  }

  /**
   * Sends a command to Unity
   * @param {string} type - Command type
   * @param {object} params - Command parameters
   * @returns {Promise<any>} - Response from Unity
   */
  async sendCommand(type, params = {}) {
    if (!this.connected) {
      throw new Error('Not connected to Unity');
    }

    const id = String(++this.commandId);
    const command = {
      id,
      type,
      params
    };

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(id);
        reject(new Error('Command timeout'));
      }, config.unity.commandTimeout);

      // Store pending command
      this.pendingCommands.set(id, {
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });

      // Send command
      const json = JSON.stringify(command);
      logger.debug(`Sending command: ${json}`);
      
      this.socket.write(json, (error) => {
        if (error) {
          this.pendingCommands.delete(id);
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  /**
   * Sends a ping command to Unity
   * @returns {Promise<any>}
   */
  async ping() {
    // Special handling for ping - send raw string
    if (!this.connected) {
      throw new Error('Not connected to Unity');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);

      // Set up one-time listener for pong response
      const handlePong = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.status === 'success' && response.data && response.data.message === 'pong') {
            clearTimeout(timeout);
            this.socket.removeListener('data', handlePong);
            resolve(response.data);
          }
        } catch (error) {
          // Ignore parsing errors for non-pong messages
        }
      };

      this.socket.on('data', handlePong);
      
      this.socket.write('ping', (error) => {
        if (error) {
          clearTimeout(timeout);
          this.socket.removeListener('data', handlePong);
          reject(error);
        }
      });
    });
  }

  /**
   * Checks if connected to Unity
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }
}