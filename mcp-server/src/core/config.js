import fs from 'fs';
import path from 'path';
import * as findUpPkg from 'find-up';
import { MCPLogger } from './mcpLogger.js';

function findUpSyncCompat(matcher, options = {}) {
  if (typeof matcher === 'function') {
    let dir = options.cwd || process.cwd();
    const { root } = path.parse(dir);
    // walk up until root
    while (true) {
      const found = matcher(dir);
      if (found) return found;
      if (dir === root) return undefined;
      dir = path.dirname(dir);
    }
  }
  if (typeof findUpPkg.sync === 'function') return findUpPkg.sync(matcher, options);
  if (typeof findUpPkg === 'function') return findUpPkg(matcher, options);
  return undefined;
}

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

function parseBoolEnv(value) {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().toLowerCase();
  if (v === '') return undefined;
  if (v === '1' || v === 'true' || v === 'yes' || v === 'y' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'n' || v === 'off') return false;
  return undefined;
}

function parseIntEnv(value) {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (v === '') return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

function envString(key) {
  const raw = process.env[key];
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim();
  return v.length > 0 ? v : undefined;
}

function isDockerEnvironment() {
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

function resolvePackageVersion() {
  const candidates = [];

  // Resolve relative to this module (always inside mcp-server/src/core)
  try {
    const moduleDir = path.dirname(new URL(import.meta.url).pathname);
    candidates.push(path.resolve(moduleDir, '../../package.json'));
  } catch {}

  // When executed from workspace root (monorepo) or inside mcp-server package
  try {
    const here = findUpSyncCompat('package.json', { cwd: process.cwd() });
    if (here) candidates.push(here);
  } catch {}

  for (const candidate of candidates) {
    try {
      if (!candidate || !fs.existsSync(candidate)) continue;
      const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (pkg?.version) return pkg.version;
    } catch {}
  }

  return '0.1.0';
}

/**
 * Base configuration for Unity MCP Server Server
 */
const baseConfig = {
  // Unity connection settings
  unity: {
    unityHost: 'localhost',
    mcpHost: 'localhost',
    bindHost: 'localhost',
    port: 6400,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    reconnectBackoffMultiplier: 2,
    connectTimeout: 3000,
    commandTimeout: 30000
  },

  // Project settings (primarily for code index paths)
  project: {
    root: null,
    codeIndexRoot: null
  },

  // Server settings
  server: {
    name: 'unity-mcp-server',
    version: resolvePackageVersion(),
    description: 'MCP server for Unity Editor integration'
  },

  // Compatibility / safety checks
  compat: {
    // warn|error|off
    versionMismatch: 'warn'
  },

  // Logging settings
  logging: {
    level: 'info',
    prefix: '[unity-mcp-server]'
  },

  // HTTP transport (off by default)
  http: {
    enabled: false,
    host: '0.0.0.0',
    port: 6401,
    healthPath: '/healthz',
    allowedHosts: ['localhost', '127.0.0.1']
  },

  telemetry: {
    enabled: false,
    destinations: [],
    fields: []
  },

  // Write queue removed: all edits go through structured Roslyn tools.

  // Search-related defaults and engine selection
  search: {
    // detail alias: 'compact' maps to returnMode 'snippets'
    defaultDetail: 'compact', // compact|metadata|snippets|full
    engine: 'naive' // naive|treesitter (future)
  },

  // LSP client defaults
  lsp: {
    requestTimeoutMs: 120000
  },

  // Indexing (code index) settings
  indexing: {
    // Enable periodic incremental index updates (polling watcher)
    watch: true,
    // Polling interval (ms)
    intervalMs: 15000,
    // Build options
    concurrency: 8,
    retry: 2,
    reportEvery: 500
  }
};

function loadEnvConfig() {
  const unityHost = envString('UNITY_MCP_UNITY_HOST');
  const mcpHost = envString('UNITY_MCP_MCP_HOST');
  const unityPort = parseIntEnv(process.env.UNITY_MCP_PORT);

  const projectRoot = envString('UNITY_PROJECT_ROOT');

  const logLevel = envString('UNITY_MCP_LOG_LEVEL');
  const versionMismatch = envString('UNITY_MCP_VERSION_MISMATCH');

  const httpEnabled = parseBoolEnv(process.env.UNITY_MCP_HTTP_ENABLED);
  const httpPort = parseIntEnv(process.env.UNITY_MCP_HTTP_PORT);

  const telemetryEnabled = parseBoolEnv(process.env.UNITY_MCP_TELEMETRY_ENABLED);
  const lspRequestTimeoutMs = parseIntEnv(process.env.UNITY_MCP_LSP_REQUEST_TIMEOUT_MS);

  const out = {};

  if (!mcpHost && isDockerEnvironment()) {
    out.unity = { ...(out.unity || {}), mcpHost: 'host.docker.internal' };
  }

  if (unityHost || mcpHost || unityPort !== undefined) {
    out.unity = { ...(out.unity || {}) };
    if (unityHost) out.unity.unityHost = unityHost;
    if (mcpHost) out.unity.mcpHost = mcpHost;
    if (unityPort !== undefined) out.unity.port = unityPort;
    if (out.unity.unityHost) out.unity.bindHost = out.unity.unityHost;
  }

  if (projectRoot) {
    out.project = {};
    if (projectRoot) out.project.root = projectRoot;
  }

  if (logLevel) {
    out.logging = { level: logLevel };
  }

  if (versionMismatch) {
    out.compat = { versionMismatch };
  }

  if (httpEnabled !== undefined || httpPort !== undefined) {
    out.http = {};
    if (httpEnabled !== undefined) out.http.enabled = httpEnabled;
    if (httpPort !== undefined) out.http.port = httpPort;
  }

  if (telemetryEnabled !== undefined) {
    out.telemetry = { enabled: telemetryEnabled };
  }

  if (lspRequestTimeoutMs !== undefined) {
    out.lsp = { requestTimeoutMs: lspRequestTimeoutMs };
  }

  return out;
}

function validateAndNormalizeConfig(cfg) {
  // Unity port
  if (!Number.isInteger(cfg.unity.port) || cfg.unity.port <= 0 || cfg.unity.port >= 65536) {
    console.error(
      `[unity-mcp-server] WARN: Invalid UNITY_MCP_PORT (${cfg.unity.port}); using default 6400`
    );
    cfg.unity.port = 6400;
  }

  // HTTP port
  if (cfg.http?.port !== undefined) {
    if (!Number.isInteger(cfg.http.port) || cfg.http.port <= 0 || cfg.http.port >= 65536) {
      console.error(
        `[unity-mcp-server] WARN: Invalid UNITY_MCP_HTTP_PORT (${cfg.http.port}); using default 6401`
      );
      cfg.http.port = 6401;
    }
  }

  // logging.level
  if (cfg.logging?.level) {
    const level = String(cfg.logging.level).toLowerCase();
    const allowed = new Set(['debug', 'info', 'warn', 'warning', 'error']);
    if (!allowed.has(level)) {
      console.error(
        `[unity-mcp-server] WARN: Invalid UNITY_MCP_LOG_LEVEL (${cfg.logging.level}); using default info`
      );
      cfg.logging.level = 'info';
    } else {
      cfg.logging.level = level === 'warning' ? 'warn' : level;
    }
  }

  // compat.versionMismatch
  if (cfg.compat?.versionMismatch) {
    const raw = String(cfg.compat.versionMismatch).trim().toLowerCase();
    const normalized =
      raw === 'warning' ? 'warn' : raw === 'none' || raw === 'ignore' ? 'off' : raw;
    const allowed = new Set(['warn', 'error', 'off']);
    if (!allowed.has(normalized)) {
      console.error(
        `[unity-mcp-server] WARN: Invalid UNITY_MCP_VERSION_MISMATCH (${cfg.compat.versionMismatch}); using default warn`
      );
      cfg.compat.versionMismatch = 'warn';
    } else {
      cfg.compat.versionMismatch = normalized;
    }
  }

  // unity hosts
  if (typeof cfg.unity.unityHost !== 'string' || cfg.unity.unityHost.trim() === '') {
    cfg.unity.unityHost = 'localhost';
  }
  if (typeof cfg.unity.mcpHost !== 'string' || cfg.unity.mcpHost.trim() === '') {
    cfg.unity.mcpHost = cfg.unity.unityHost;
  }
  cfg.unity.bindHost = cfg.unity.unityHost;

  // project roots (keep as-is; resolved later)
  if (cfg.project?.root && typeof cfg.project.root !== 'string') {
    cfg.project.root = null;
  }
  if (cfg.project?.codeIndexRoot && typeof cfg.project.codeIndexRoot !== 'string') {
    cfg.project.codeIndexRoot = null;
  }

  // lsp timeout sanity
  if (cfg.lsp?.requestTimeoutMs !== undefined) {
    const t = Number(cfg.lsp.requestTimeoutMs);
    if (!Number.isFinite(t) || t <= 0) {
      console.error(
        `[unity-mcp-server] WARN: Invalid UNITY_MCP_LSP_REQUEST_TIMEOUT_MS (${cfg.lsp.requestTimeoutMs}); using default 60000`
      );
      cfg.lsp.requestTimeoutMs = 60000;
    }
  }
}

export const config = merge(baseConfig, loadEnvConfig());
validateAndNormalizeConfig(config);

// Workspace root: current working directory (used for cache/capture roots)
export const WORKSPACE_ROOT = process.cwd();

/**
 * Logger utility
 * IMPORTANT: In MCP servers, all stdout output must be JSON-RPC protocol messages.
 * Logging must go to stderr to avoid breaking the protocol.
 *
 * MCP SDK-compliant logger with RFC 5424 log levels.
 * Supports dual output: stderr (developer) + MCP notification (client)
 */
export const logger = new MCPLogger(config);

// Startup debug log: output config info to stderr for troubleshooting
// This helps diagnose connection issues (especially in WSL2/Docker environments)
console.error(`[unity-mcp-server] Startup config:`);
console.error(
  `[unity-mcp-server]   Unity host: ${config.unity.mcpHost || config.unity.unityHost || 'localhost'}`
);
console.error(`[unity-mcp-server]   Unity port: ${config.unity.port}`);
console.error(`[unity-mcp-server]   Workspace root: ${WORKSPACE_ROOT}`);
