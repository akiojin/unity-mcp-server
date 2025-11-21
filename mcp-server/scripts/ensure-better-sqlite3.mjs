#!/usr/bin/env node
/**
 * Postinstall helper to ensure better-sqlite3 has a native binding.
 * - If the prebuilt binding is missing, it attempts to rerun better-sqlite3's install script.
 * - On failure it prints actionable guidance but never fails the install (sql.js fallback will be used).
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const abiLabel = `node-v${process.versions.modules}`;
const bundled = path.join(
  pkgRoot,
  'prebuilt',
  'better-sqlite3',
  `${process.platform}-${process.arch}-${abiLabel}`,
  'better_sqlite3.node'
);

function resolveBetterSqliteDir() {
  try {
    const pkgJson = require.resolve('better-sqlite3/package.json', { paths: [pkgRoot] });
    return path.dirname(pkgJson);
  } catch {
    return null;
  }
}

function findBinding(dir) {
  if (!dir) return { exists: false, path: null, candidates: [] };
  const candidates = [
    path.join(dir, 'build', 'Release', 'better_sqlite3.node'),
    path.join(
      dir,
      'compiled',
      process.version,
      process.platform,
      process.arch,
      'better_sqlite3.node'
    ),
    path.join(dir, 'build', 'Debug', 'better_sqlite3.node'),
    path.join(dir, 'build', 'better_sqlite3.node')
  ];
  const found = candidates.find(fs.existsSync) || null;
  return { exists: Boolean(found), path: found, candidates };
}

function copyBundled(dir) {
  if (!fs.existsSync(bundled)) return false;
  const targets = [
    path.join(dir, 'build', 'Release', 'better_sqlite3.node'),
    path.join(
      dir,
      'compiled',
      process.version,
      process.platform,
      process.arch,
      'better_sqlite3.node'
    )
  ];
  for (const t of targets) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.copyFileSync(bundled, t);
  }
  return true;
}

function attemptRebuild(dir) {
  const script = path.join(dir, 'install.js');
  if (!fs.existsSync(script)) {
    return { ok: false, reason: 'install.js not found' };
  }
  const result = spawnSync(process.execPath, [script], {
    cwd: dir,
    env: { ...process.env },
    stdio: 'inherit'
  });
  return { ok: result.status === 0, exitCode: result.status ?? -1 };
}

function main() {
  const dir = resolveBetterSqliteDir();
  if (!dir) {
    console.warn(
      '[unity-mcp-server] better-sqlite3 module not found; skipping native binding check.'
    );
    return;
  }

  if (copyBundled(dir)) {
    const afterBundled = findBinding(dir);
    if (afterBundled.exists) {
      console.log(
        `[unity-mcp-server] better-sqlite3 binding restored from bundled prebuild: ${afterBundled.path}`
      );
      return;
    }
  }

  const before = findBinding(dir);
  if (before.exists) {
    console.log(`[unity-mcp-server] better-sqlite3 binding present: ${before.path}`);
    return;
  }

  console.warn('[unity-mcp-server] better-sqlite3 binding missing; attempting rebuild...');
  const rebuild = attemptRebuild(dir);
  if (rebuild.ok) {
    const after = findBinding(dir);
    if (after.exists) {
      console.log(`[unity-mcp-server] better-sqlite3 binding restored: ${after.path}`);
      return;
    }
  }

  console.warn(
    '[unity-mcp-server] better-sqlite3 binding still missing. Install build tools (python3, make, g++) and run "npm rebuild better-sqlite3 --build-from-source" inside this environment. Falling back to sql.js at runtime.'
  );
}

main();
