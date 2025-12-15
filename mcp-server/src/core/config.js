import fs from 'fs';
import os from 'os';
import path from 'path';
import * as findUpPkg from 'find-up';
import { MCPLogger } from './mcpLogger.js';

// Diagnostic log: confirm module loading reached this point
process.stderr.write('[unity-mcp-server] Config module loading...\n');

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
    unityHost: null,
    mcpHost: null,
    bindHost: null,
    port: 6400,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    reconnectBackoffMultiplier: 2,
    commandTimeout: 30000
  },

  // Server settings
  server: {
    name: 'unity-mcp-server',
    version: resolvePackageVersion(),
    description: 'MCP server for Unity Editor integration'
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
    requestTimeoutMs: 60000
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

/**
 * External config resolution:
 * - Uses the nearest `.unity/config.json` found by walking up from the current working directory.
 * - Intentionally ignores `~/.unity/config.json` (user-global).
 */
function loadExternalConfig() {
  if (typeof findUpSyncCompat !== 'function') {
    return {};
  }
  let userGlobalPath = null;
  try {
    const homeDir = os.homedir();
    userGlobalPath = homeDir ? path.resolve(homeDir, '.unity', 'config.json') : null;
  } catch {}

  const projectPath = findUpSyncCompat(
    directory => {
      const candidate = path.resolve(directory, '.unity', 'config.json');
      if (userGlobalPath && path.resolve(candidate) === userGlobalPath) return undefined;
      return fs.existsSync(candidate) ? candidate : undefined;
    },
    { cwd: process.cwd() }
  );

  if (!projectPath) return {};
  try {
    const raw = fs.readFileSync(projectPath, 'utf8');
    const json = JSON.parse(raw);
    const out = json && typeof json === 'object' ? json : {};
    out.__configPath = projectPath;
    return out;
  } catch (e) {
    return { __configLoadError: `${projectPath}: ${e.message}` };
  }
}

const external = loadExternalConfig();
export const config = merge(baseConfig, external);

const normalizeUnityConfig = () => {
  const unityConfig = config.unity || (config.unity = {});

  // Legacy aliases coming from config files
  const legacyHost = unityConfig.host;
  const legacyClientHost = unityConfig.clientHost;
  const legacyBindHost = unityConfig.bindHost;

  if (!unityConfig.unityHost) {
    unityConfig.unityHost = legacyBindHost || legacyHost || 'localhost';
  }

  if (!unityConfig.mcpHost) {
    unityConfig.mcpHost = legacyClientHost || legacyHost || unityConfig.unityHost;
  }

  // Keep bindHost for backwards compatibility with legacy code paths
  if (!unityConfig.bindHost) {
    unityConfig.bindHost = legacyBindHost || unityConfig.unityHost;
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
    workspaceRoot = path.dirname(cfgDir); // <workspace>
  }
} catch {}
export const WORKSPACE_ROOT = workspaceRoot;

/**
 * Logger utility
 * IMPORTANT: In MCP servers, all stdout output must be JSON-RPC protocol messages.
 * Logging must go to stderr to avoid breaking the protocol.
 *
 * MCP SDK-compliant logger with RFC 5424 log levels.
 * Supports dual output: stderr (developer) + MCP notification (client)
 */
export const logger = new MCPLogger(config);

// Late log if external config failed to load
if (config.__configLoadError) {
  console.error(
    `${baseConfig.logging.prefix} WARN: Failed to load external config: ${config.__configLoadError}`
  );
  delete config.__configLoadError;
}

// Startup debug log: output config info to stderr for troubleshooting
// This helps diagnose connection issues (especially in WSL2/Docker environments)
console.error(`[unity-mcp-server] Startup config:`);
console.error(`[unity-mcp-server]   Config file: ${config.__configPath || '(not found)'}`);
console.error(
  `[unity-mcp-server]   Unity host: ${config.unity.mcpHost || config.unity.unityHost || 'localhost'}`
);
console.error(`[unity-mcp-server]   Unity port: ${config.unity.port}`);
console.error(`[unity-mcp-server]   Workspace root: ${WORKSPACE_ROOT}`);
