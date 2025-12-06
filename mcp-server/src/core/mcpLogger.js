/**
 * MCP SDK-compliant Logger
 *
 * RFC 5424 compliant logging with MCP notification support.
 * Provides 8 log levels: emergency, alert, critical, error, warning, notice, info, debug
 *
 * Features:
 * - Dual output: stderr (developer) + MCP notification (client)
 * - Dynamic log level control via setLevel()
 * - Fire-and-forget MCP notifications (non-blocking)
 * - Error resilience: continues logging even if MCP notification fails
 */

/**
 * RFC 5424 log levels (syslog severity)
 * Lower numbers = higher severity
 */
export const LOG_LEVELS = {
  emergency: 0, // System is unusable
  alert: 1, // Action must be taken immediately
  critical: 2, // Critical conditions
  error: 3, // Error conditions
  warning: 4, // Warning conditions
  notice: 5, // Normal but significant condition
  info: 6, // Informational messages
  debug: 7 // Debug-level messages
};

/**
 * MCP-compliant Logger class
 */
export class MCPLogger {
  /**
   * @param {Object} config - Configuration object
   * @param {Object} [config.logging] - Logging configuration
   * @param {string} [config.logging.prefix='[unity-mcp-server]'] - Log prefix
   * @param {string} [config.logging.level='info'] - Minimum log level
   */
  constructor(config) {
    this.prefix = config?.logging?.prefix || '[unity-mcp-server]';
    this.minLevel = LOG_LEVELS[config?.logging?.level || 'info'];
    this.server = null;
    this.transportConnected = false;
  }

  /**
   * Set MCP Server instance for sending notifications
   * Should be called after transport is connected
   * @param {Object} server - MCP Server instance with sendLoggingMessage method
   */
  setServer(server) {
    this.server = server;
    this.transportConnected = true;
  }

  /**
   * Dynamically change log level
   * @param {string} level - New log level (RFC 5424 level name)
   */
  setLevel(level) {
    if (LOG_LEVELS[level] !== undefined) {
      this.minLevel = LOG_LEVELS[level];
    }
  }

  /**
   * Internal log method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  _log(level, message, ...args) {
    const levelNum = LOG_LEVELS[level];

    // Filter by minimum level
    if (levelNum > this.minLevel) return;

    // 1. Always output to stderr (developer-facing)
    const formatted = this._formatMessage(level, message);
    console.error(formatted, ...args);

    // 2. Send MCP notification (client-facing, only when connected)
    if (this.transportConnected && this.server) {
      this._sendMcpLog(level, message, args);
    }
  }

  /**
   * Send log message via MCP notification
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any[]} args - Additional arguments
   */
  _sendMcpLog(level, message, args) {
    try {
      // Concatenate additional arguments into a single string
      const fullMessage =
        args.length > 0
          ? `${message} ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}`
          : message;

      this.server.sendLoggingMessage({
        level,
        logger: 'unity-mcp-server',
        data: fullMessage // String only (no structured data)
      });
    } catch (e) {
      // Log failure but continue (error resilience)
      console.error(`${this.prefix} [MCP notification failed] ${e.message}`);
    }
  }

  /**
   * Format message for stderr output
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @returns {string} Formatted message
   */
  _formatMessage(level, message) {
    // info level doesn't include level label (matches existing behavior)
    const label = level === 'info' ? '' : ` ${level.toUpperCase()}:`;
    return `${this.prefix}${label} ${message}`;
  }

  // Public log methods (RFC 5424 levels)

  /**
   * Emergency: System is unusable
   */
  emergency(message, ...args) {
    this._log('emergency', message, ...args);
  }

  /**
   * Alert: Action must be taken immediately
   */
  alert(message, ...args) {
    this._log('alert', message, ...args);
  }

  /**
   * Critical: Critical conditions
   */
  critical(message, ...args) {
    this._log('critical', message, ...args);
  }

  /**
   * Error: Error conditions
   */
  error(message, ...args) {
    this._log('error', message, ...args);
  }

  /**
   * Warning: Warning conditions
   */
  warning(message, ...args) {
    this._log('warning', message, ...args);
  }

  /**
   * Notice: Normal but significant condition
   */
  notice(message, ...args) {
    this._log('notice', message, ...args);
  }

  /**
   * Info: Informational messages
   */
  info(message, ...args) {
    this._log('info', message, ...args);
  }

  /**
   * Debug: Debug-level messages
   */
  debug(message, ...args) {
    this._log('debug', message, ...args);
  }
}
