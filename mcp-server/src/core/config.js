import fs from 'fs';
import path from 'path';

/**
 * Shallow merge utility (simple objects only)
 */
function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object') {
      out[k] = { ...a[k], ...v };
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Base configuration for Unity Editor MCP Server
 */
const baseConfig = {
  // Unity connection settings
  unity: {
    host: process.env.UNITY_HOST || 'localhost',
    port: parseInt(process.env.UNITY_PORT || '', 10) || 6400,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    reconnectBackoffMultiplier: 2,
    commandTimeout: 30000,
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
  },

  // Write queue/debounce settings
  writeQueue: {
    debounceMs: parseInt(process.env.WRITE_DEBOUNCE_MS || '', 10) || 1200,
    maxEdits: parseInt(process.env.WRITE_MAX_EDITS || '', 10) || 100,
    deferDefault: String(process.env.WRITE_DEFER_DEFAULT || '').toLowerCase() === 'false' ? false : true,
  },

  // Search-related defaults and engine selection
  search: {
    // detail alias: 'compact' maps to returnMode 'snippets'
    defaultDetail: (process.env.SEARCH_DEFAULT_DETAIL || 'compact').toLowerCase(), // compact|metadata|snippets|full
    engine: (process.env.SEARCH_ENGINE || 'naive').toLowerCase(), // naive|treesitter (future)
  },
};

/**
 * Optional external config: set UNITY_MCP_CONFIG to a JSON file path,
 * or auto-read ./mcp-server/config.json if present.
 */
function loadExternalConfig() {
  const envPath = process.env.UNITY_MCP_CONFIG;
  const localPath = path.resolve(process.cwd(), 'mcp-server', 'config.json');
  const candidate = envPath && fs.existsSync(envPath)
    ? envPath
    : (fs.existsSync(localPath) ? localPath : null);
  if (!candidate) return {};
  try {
    const raw = fs.readFileSync(candidate, 'utf8');
    const json = JSON.parse(raw);
    return json && typeof json === 'object' ? json : {};
  } catch (e) {
    // Fallback silently to base config, but log via logger after export
    return { __configLoadError: e.message };
  }
}

const external = loadExternalConfig();
export const config = merge(baseConfig, external);

/**
 * Logger utility
 * IMPORTANT: In MCP servers, all stdout output must be JSON-RPC protocol messages.
 * Logging must go to stderr to avoid breaking the protocol.
 */
export const logger = {
  info: (message, ...args) => {
    if (['info', 'debug'].includes(config.logging.level)) {
      console.error(`${config.logging.prefix} ${message}`, ...args);
    }
  },
  
  warn: (message, ...args) => {
    if (['info', 'debug', 'warn'].includes(config.logging.level)) {
      console.error(`${config.logging.prefix} WARN: ${message}`, ...args);
    }
  },
  
  error: (message, ...args) => {
    console.error(`${config.logging.prefix} ERROR: ${message}`, ...args);
  },
  
  debug: (message, ...args) => {
    if (config.logging.level === 'debug') {
      console.error(`${config.logging.prefix} DEBUG: ${message}`, ...args);
    }
  }
};

// Late log if external config failed to load
if (config.__configLoadError) {
  console.error(`${baseConfig.logging.prefix} WARN: Failed to load external config: ${config.__configLoadError}`);
  delete config.__configLoadError;
}
