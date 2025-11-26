#!/usr/bin/env node
// Ensure better-sqlite3 native binding exists. Prefers bundled prebuilt binaries, otherwise
// optionally attempts a native rebuild (opt-in to avoid first-time npx timeouts).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PKG_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');

const DEFAULT_BINDING_PATH = process.env.UNITY_MCP_BINDING_PATH
  ? path.resolve(process.env.UNITY_MCP_BINDING_PATH)
  : path.join(
      PKG_ROOT,
      'node_modules',
      'better-sqlite3',
      'build',
      'Release',
      'better_sqlite3.node'
    );

const DEFAULT_PREBUILT_ROOT = process.env.UNITY_MCP_PREBUILT_DIR
  ? path.resolve(process.env.UNITY_MCP_PREBUILT_DIR)
  : path.join(PKG_ROOT, 'prebuilt', 'better-sqlite3');

export function resolvePlatformKey(
  nodeVersion = process.versions.node,
  platform = process.platform,
  arch = process.arch
) {
  const major = String(nodeVersion).split('.')[0];
  return `${platform}-${arch}-node${major}`;
}

function copyPrebuiltBinding(prebuiltDir, bindingTarget, log) {
  const platformKey = resolvePlatformKey();
  const source = path.join(prebuiltDir, platformKey, 'better_sqlite3.node');
  if (!fs.existsSync(source)) return false;
  fs.mkdirSync(path.dirname(bindingTarget), { recursive: true });
  fs.copyFileSync(source, bindingTarget);
  if (log) log(`[postinstall] Installed better-sqlite3 prebuilt for ${platformKey}`);
  return true;
}

function rebuildNative(bindingTarget, pkgRoot, log) {
  log(
    '[postinstall] No prebuilt available. Attempting native rebuild (npm rebuild better-sqlite3 --build-from-source)'
  );
  const result = spawnSync('npm', ['rebuild', 'better-sqlite3', '--build-from-source'], {
    stdio: 'inherit',
    shell: false,
    cwd: pkgRoot
  });
  if (result.status !== 0) {
    throw new Error(`better-sqlite3 rebuild failed with code ${result.status ?? 'null'}`);
  }
  if (!fs.existsSync(bindingTarget)) {
    throw new Error('better-sqlite3 rebuild completed but binding was still not found');
  }
  return true;
}

export function ensureBetterSqlite3(options = {}) {
  const {
    bindingPath = DEFAULT_BINDING_PATH,
    prebuiltRoot = DEFAULT_PREBUILT_ROOT,
    pkgRoot = PKG_ROOT,
    skipNative = process.env.UNITY_MCP_SKIP_NATIVE_BUILD !== '0',
    forceNative = process.env.UNITY_MCP_FORCE_NATIVE === '1',
    skipLegacyFlag = Boolean(process.env.SKIP_SQLITE_REBUILD),
    log = console.log,
    warn = console.warn
  } = options;

  if (skipLegacyFlag && !forceNative) {
    warn('[postinstall] SKIP_SQLITE_REBUILD set, skipping better-sqlite3 check');
    return { status: 'skipped' };
  }

  if (!forceNative && copyPrebuiltBinding(prebuiltRoot, bindingPath, log)) {
    return { status: 'copied' };
  }

  if (skipNative && !forceNative) {
    warn(
      '[postinstall] UNITY_MCP_SKIP_NATIVE_BUILD=1 -> skipping native rebuild; sql.js fallback will be used'
    );
    return { status: 'skipped' };
  }

  if (forceNative) {
    log('[postinstall] UNITY_MCP_FORCE_NATIVE=1 -> forcing better-sqlite3 rebuild');
  } else if (fs.existsSync(bindingPath)) {
    // Binding already exists and native rebuild not forced.
    return { status: 'existing' };
  }

  rebuildNative(bindingPath, pkgRoot, log);
  return { status: 'rebuilt' };
}

function isCliExecution() {
  const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return invokedPath === SCRIPT_PATH;
}

async function main() {
  try {
    await ensureBetterSqlite3();
  } catch (err) {
    console.warn(`[postinstall] Warning: ${err.message}`);
    // Do not hard fail install; runtime may still use sql.js fallback in codeIndex
  }
}

if (isCliExecution()) {
  main();
}
