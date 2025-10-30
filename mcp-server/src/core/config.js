import fs from 'fs';
import path from 'path';
import { findUpSync } from 'find-up';

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
const envUnityHost =
  process.env.UNITY_UNITY_HOST ||
  process.env.UNITY_BIND_HOST ||
  process.env.UNITY_HOST ||
  null;

const envMcpHost =
  process.env.UNITY_MCP_HOST ||
  process.env.UNITY_CLIENT_HOST ||
  process.env.UNITY_HOST ||
  null;

const envBindHost = process.env.UNITY_BIND_HOST || null;

const baseConfig = {
  // Unity connection settings
  unity: {
    unityHost: envUnityHost,
    mcpHost: envMcpHost,
    bindHost: envBindHost,
    port: parseInt(process.env.UNITY_PORT || '', 10) || 6400,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    reconnectBackoffMultiplier: 2,
    commandTimeout: 30000,
  },

  // Server settings
  server: {
    name: 'unity-mcp-server',
    version: '0.1.0',
    description: 'MCP server for Unity Editor integration',
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prefix: '[Unity Editor MCP]',
  },

  // Write queue removed: all edits go through structured Roslyn tools.

  // Search-related defaults and engine selection
  search: {
    // detail alias: 'compact' maps to returnMode 'snippets'
    defaultDetail: (process.env.SEARCH_DEFAULT_DETAIL || 'compact').toLowerCase(), // compact|metadata|snippets|full
    engine: (process.env.SEARCH_ENGINE || 'naive').toLowerCase(), // naive|treesitter (future)
  },

  // LSP client defaults
  lsp: {
    requestTimeoutMs: Number(process.env.LSP_REQUEST_TIMEOUT_MS || 60000),
  },

  // Indexing (code index) settings
  indexing: {
    // Enable periodic incremental index updates (polling watcher)
    watch: (process.env.INDEX_WATCH || 'false').toLowerCase() === 'true',
    // Polling interval (ms)
    intervalMs: Number(process.env.INDEX_WATCH_INTERVAL_MS || 15000),
    // Build options
    concurrency: Number(process.env.INDEX_CONCURRENCY || 8),
    retry: Number(process.env.INDEX_RETRY || 2),
    reportEvery: Number(process.env.INDEX_REPORT_EVERY || 500),
  },
};

/**
 * External config resolution (no legacy compatibility):
 * Priority:
 * 1) UNITY_MCP_CONFIG (explicit file path)
 * 2) ./.unity/config.json (project-local)
 * 3) ~/.unity/config.json (user-global)
 * If none found, return {} and rely on env/defaults.
 */
function loadExternalConfig() {
  const explicitPath = process.env.UNITY_MCP_CONFIG;

  const projectPath = findUpSync((directory) => {
    const candidate = path.resolve(directory, '.unity', 'config.json');
    return fs.existsSync(candidate) ? candidate : undefined;
  }, { cwd: process.cwd() });
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const userPath = homeDir ? path.resolve(homeDir, '.unity', 'config.json') : null;

  const candidates = [explicitPath, projectPath, userPath].filter(Boolean);
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const json = JSON.parse(raw);
        const out = json && typeof json === 'object' ? json : {};
        out.__configPath = p;
        return out;
      }
    } catch (e) {
      return { __configLoadError: `${p}: ${e.message}` };
    }
  }
  return {};
}

const external = loadExternalConfig();
export const config = merge(baseConfig, external);

// AI agent defaults
if (!Array.isArray(config.aiAgents)) {
  config.aiAgents = [];
}

if (!config.aiSessions || typeof config.aiSessions !== 'object') {
  config.aiSessions = {};
}

const cacheConfig = config.aiSessions.cache || {};
config.aiSessions.cache = {
  enabled: Boolean(cacheConfig.enabled),
  maxSessions: Number.isFinite(cacheConfig.maxSessions) ? cacheConfig.maxSessions : 100,
  maxLogsPerAction: Number.isFinite(cacheConfig.maxLogsPerAction) ? cacheConfig.maxLogsPerAction : 500
};

const normalizeUnityConfig = () => {
  const unityConfig = config.unity || (config.unity = {});

  // Legacy aliases coming from config files or env vars
  const legacyHost = unityConfig.host;
  const legacyClientHost = unityConfig.clientHost;
  const legacyBindHost = unityConfig.bindHost;

  if (!unityConfig.unityHost) {
    unityConfig.unityHost = legacyBindHost || legacyHost || envUnityHost || 'localhost';
  }

  if (!unityConfig.mcpHost) {
    unityConfig.mcpHost = legacyClientHost || envMcpHost || legacyHost || unityConfig.unityHost;
  }

  // Keep bindHost for backwards compatibility with legacy code paths
  if (!unityConfig.bindHost) {
    unityConfig.bindHost = legacyBindHost || envBindHost || unityConfig.unityHost;
  }

  // Maintain legacy properties so older handlers keep working
  unityConfig.host = unityConfig.unityHost;
  unityConfig.clientHost = unityConfig.mcpHost;
};

normalizeUnityConfig();

// Workspace root detection: directory that contains .unity/config.json used
const initialCwd = process.cwd();
let workspaceRoot = initialCwd;
try {
  if (config.__configPath) {
    const cfgDir = path.dirname(config.__configPath); // <workspace>/.unity
    workspaceRoot = path.dirname(cfgDir);            // <workspace>
  }
} catch {}
export const WORKSPACE_ROOT = workspaceRoot;

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
