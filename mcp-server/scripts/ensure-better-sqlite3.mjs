#!/usr/bin/env node
// Ensure better-sqlite3 native binding exists; rebuild if missing (covers npx install where prebuilt not shipped)
import { existsSync } from 'fs';
import { resolve } from 'path';
import { spawnSync } from 'child_process';

const bindingPath = resolve(
  'node_modules',
  'better-sqlite3',
  'build',
  'Release',
  'better_sqlite3.node'
);
// Default: skip native rebuild to avoid first-time npx timeouts; set UNITY_MCP_SKIP_NATIVE_BUILD=0 to allow.
const skipNative = process.env.UNITY_MCP_SKIP_NATIVE_BUILD !== '0';
const forceNative = process.env.UNITY_MCP_FORCE_NATIVE === '1';

function main() {
  if (process.env.SKIP_SQLITE_REBUILD) {
    console.log('[postinstall] SKIP_SQLITE_REBUILD set, skipping better-sqlite3 check');
    return;
  }

  if (skipNative && !forceNative) {
    console.log(
      '[postinstall] UNITY_MCP_SKIP_NATIVE_BUILD=1 -> skipping better-sqlite3 rebuild (will rely on fallback/sql.js if missing)'
    );
    return;
  }

  if (forceNative) {
    console.log(
      '[postinstall] UNITY_MCP_FORCE_NATIVE=1 -> forcing better-sqlite3 rebuild even if binding exists'
    );
  }

  if (!forceNative && existsSync(bindingPath)) {
    return;
  }

  console.log(
    '[postinstall] better-sqlite3 binding missing; rebuilding (npm rebuild better-sqlite3 --build-from-source)'
  );
  const result = spawnSync('npm', ['rebuild', 'better-sqlite3', '--build-from-source'], {
    stdio: 'inherit',
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(`better-sqlite3 rebuild failed with code ${result.status ?? 'null'}`);
  }

  if (!existsSync(bindingPath)) {
    throw new Error('better-sqlite3 rebuild completed but binding was still not found');
  }
}

try {
  main();
} catch (err) {
  console.warn(`[postinstall] Warning: ${err.message}`);
  // Do not hard fail install; runtime may still use sql.js fallback in codeIndex
}
