import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  ensureBetterSqlite3,
  resolvePlatformKey
} from '../../../scripts/ensure-better-sqlite3.mjs';

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function createDummyPrebuilt(root) {
  const key = resolvePlatformKey();
  const dir = path.join(root, key);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'better_sqlite3.node');
  fs.writeFileSync(file, 'dummy');
  return { dir, file };
}

test('copies bundled prebuilt when available', () => {
  const workspace = tempDir('mcp-prebuilt-');
  const prebuiltRoot = path.join(workspace, 'prebuilt');
  const bindingDir = path.join(workspace, 'binding');
  fs.mkdirSync(bindingDir, { recursive: true });
  createDummyPrebuilt(prebuiltRoot);
  const bindingTarget = path.join(bindingDir, 'better_sqlite3.node');

  const result = ensureBetterSqlite3({
    prebuiltRoot,
    bindingPath: bindingTarget,
    pkgRoot: workspace,
    skipNative: false
  });

  assert.equal(result.status, 'copied');
  assert.equal(fs.readFileSync(bindingTarget, 'utf8'), 'dummy');
});

test('skips native rebuild when prebuilt missing and skip flag enabled', () => {
  const workspace = tempDir('mcp-prebuilt-skip-');
  const prebuiltRoot = path.join(workspace, 'prebuilt');
  const bindingTarget = path.join(workspace, 'binding', 'better_sqlite3.node');
  const result = ensureBetterSqlite3({
    prebuiltRoot,
    bindingPath: bindingTarget,
    pkgRoot: workspace,
    skipNative: true,
    forceNative: false
  });
  assert.equal(result.status, 'skipped');
  assert.ok(!fs.existsSync(bindingTarget));
});

test('returns existing when binding already present', () => {
  const workspace = tempDir('mcp-prebuilt-existing-');
  const bindingTarget = path.join(
    workspace,
    'node_modules',
    'better-sqlite3',
    'build',
    'Release',
    'better_sqlite3.node'
  );
  fs.mkdirSync(path.dirname(bindingTarget), { recursive: true });
  fs.writeFileSync(bindingTarget, 'native');
  const result = ensureBetterSqlite3({
    prebuiltRoot: path.join(workspace, 'prebuilt'),
    bindingPath: bindingTarget,
    pkgRoot: workspace,
    skipNative: false,
    forceNative: false
  });
  assert.equal(result.status, 'existing');
});
