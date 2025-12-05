import fs from 'fs';
import path from 'path';
import * as findUpPkg from 'find-up';
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
const envUnityHost = process.env.UNITY_BIND_HOST || process.env.UNITY_HOST || null;

const envMcpHost =
  process.env.UNITY_MCP_HOST || process.env.UNITY_CLIENT_HOST || process.env.UNITY_HOST || null;

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
    level: process.env.LOG_LEVEL || 'info',
    prefix: '[Unity MCP Server]'
  },

  // HTTP transport (off by default)
  http: {
    enabled: (process.env.UNITY_MCP_HTTP_ENABLED || 'false').toLowerCase() === 'true',
    host: process.env.UNITY_MCP_HTTP_HOST || '0.0.0.0',
    port: parseInt(process.env.UNITY_MCP_HTTP_PORT || '', 10) || 6401,
    healthPath: '/healthz',
    allowedHosts: (process.env.UNITY_MCP_HTTP_ALLOWED_HOSTS || 'localhost,127.0.0.1')
      .split(',')
      .map(h => h.trim())
      .filter(h => h.length > 0)
  },

  telemetry: {
    enabled: (process.env.UNITY_MCP_TELEMETRY || 'off').toLowerCase() === 'on',
    destinations: [],
    fields: []
  },

  // Write queue removed: all edits go through structured Roslyn tools.

  // Search-related defaults and engine selection
  search: {
    // detail alias: 'compact' maps to returnMode 'snippets'
    defaultDetail: (process.env.SEARCH_DEFAULT_DETAIL || 'compact').toLowerCase(), // compact|metadata|snippets|full
    engine: (process.env.SEARCH_ENGINE || 'naive').toLowerCase() // naive|treesitter (future)
  },

  // LSP client defaults
  lsp: {
    requestTimeoutMs: Number(process.env.LSP_REQUEST_TIMEOUT_MS || 60000)
  },

  // Indexing (code index) settings
  indexing: {
    // Enable periodic incremental index updates (polling watcher)
    watch: true,
    // Polling interval (ms)
    intervalMs: Number(process.env.INDEX_WATCH_INTERVAL_MS || 15000),
    // Build options
    concurrency: Number(process.env.INDEX_CONCURRENCY || 8),
    retry: Number(process.env.INDEX_RETRY || 2),
    reportEvery: Number(process.env.INDEX_REPORT_EVERY || 500)
  }
};

/**
 * External config resolution (no legacy compatibility):
 * Priority:
 * 1) UNITY_MCP_CONFIG (explicit file path)
 * 2) ./.unity/config.json (project-local)
 * 3) ~/.unity/config.json (user-global)
 * If none found, create ./.unity/config.json with defaults.
 */
function ensureDefaultProjectConfig(baseDir) {
  const dir = path.resolve(baseDir, '.unity');
  const file = path.join(dir, 'config.json');

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(file)) {
      const inferredRoot = fs.existsSync(path.join(baseDir, 'Assets')) ? baseDir : '';
      const defaultConfig = {
        unity: {
          unityHost: 'localhost',
          mcpHost: 'localhost',
          port: 6400
        },
        project: {
          root: inferredRoot ? inferredRoot.replace(/\\/g, '/') : ''
        }
      };
      fs.writeFileSync(file, `${JSON.stringify(defaultConfig, null, 2)}\n`, 'utf8');
    }
    return file;
  } catch (error) {
    return null;
  }
}

function loadExternalConfig() {
  if (typeof findUpSyncCompat !== 'function') {
    return {};
  }
  const explicitPath = process.env.UNITY_MCP_CONFIG;

  const projectPath = findUpSyncCompat(
    directory => {
      const candidate = path.resolve(directory, '.unity', 'config.json');
      return fs.existsSync(candidate) ? candidate : undefined;
    },
    { cwd: process.cwd() }
  );
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
  const fallbackPath = ensureDefaultProjectConfig(process.cwd());
  if (fallbackPath && fs.existsSync(fallbackPath)) {
    try {
      const raw = fs.readFileSync(fallbackPath, 'utf8');
      const json = JSON.parse(raw);
      const out = json && typeof json === 'object' ? json : {};
      out.__configPath = fallbackPath;
      out.__configGenerated = true;
      return out;
    } catch (e) {
      return { __configLoadError: `${fallbackPath}: ${e.message}` };
    }
  }
  return {};
}

const external = loadExternalConfig();
export const config = merge(baseConfig, external);

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
    workspaceRoot = path.dirname(cfgDir); // <workspace>
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
  console.error(
    `${baseConfig.logging.prefix} WARN: Failed to load external config: ${config.__configLoadError}`
  );
  delete config.__configLoadError;
}
