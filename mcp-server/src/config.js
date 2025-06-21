/**
 * Configuration for Unity Editor MCP Server
 */
export const config = {
  // Unity connection settings
  unity: {
    host: process.env.UNITY_HOST || 'localhost',
    port: parseInt(process.env.UNITY_PORT) || 6400,
    reconnectDelay: 1000, // Initial reconnect delay in ms
    maxReconnectDelay: 30000, // Maximum reconnect delay
    reconnectBackoffMultiplier: 2,
    commandTimeout: 30000, // Command timeout in ms
  },
  
  // Server settings
  server: {
    name: 'unity-editor-mcp-server',
    version: '0.1.0',
    description: 'MCP server for Unity Editor integration',
  },
  
  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prefix: '[Unity Editor MCP]',
  }
};

/**
 * Logger utility
 */
export const logger = {
  info: (message) => {
    if (['info', 'debug'].includes(config.logging.level)) {
      console.log(`${config.logging.prefix} ${message}`);
    }
  },
  
  error: (message, error) => {
    console.error(`${config.logging.prefix} ERROR: ${message}`, error || '');
  },
  
  debug: (message) => {
    if (config.logging.level === 'debug') {
      console.log(`${config.logging.prefix} DEBUG: ${message}`);
    }
  }
};