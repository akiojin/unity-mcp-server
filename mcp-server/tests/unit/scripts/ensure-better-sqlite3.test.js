import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  buildPlatformKey,
  ensureBetterSqlite3,
  resolveNodeAbi
} from '../../../scripts/ensure-better-sqlite3.mjs';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'unity-mcp-'));
}

describe('scripts/ensure-better-sqlite3.mjs', () => {
  it('maps Node ABI for supported versions', () => {
    assert.strictEqual(resolveNodeAbi({ nodeVersion: '18.20.0' }), 115);
    assert.strictEqual(resolveNodeAbi({ nodeVersion: '20.11.1' }), 120);
    assert.strictEqual(resolveNodeAbi({ nodeVersion: '22.0.0' }), 131);
    assert.strictEqual(resolveNodeAbi({ nodeVersion: '24.0.0' }), 137);
  });

  it('builds platform key from runtime info', () => {
    assert.strictEqual(
      buildPlatformKey({ platform: 'linux', arch: 'x64', nodeMajor: 22 }),
      'linux-x64-node22'
    );
  });

  it('copies prebuilt binary when present', () => {
    const tempRoot = makeTempDir();
    const prebuiltRoot = path.join(tempRoot, 'prebuilt', 'better-sqlite3');
    const platformKey = 'linux-x64-node22';
    const prebuiltDir = path.join(prebuiltRoot, platformKey);
    const moduleRoot = path.join(tempRoot, 'node_modules', 'better-sqlite3');
    const prebuiltBinary = path.join(prebuiltDir, 'better_sqlite3.node');
    const destBinary = path.join(moduleRoot, 'build', 'Release', 'better_sqlite3.node');

    fs.mkdirSync(prebuiltDir, { recursive: true });
    fs.mkdirSync(path.dirname(destBinary), { recursive: true });
    fs.writeFileSync(prebuiltBinary, 'stub');

    const result = ensureBetterSqlite3({
      env: {},
      packageRoot: tempRoot,
      prebuiltRoot,
      moduleRoot,
      platform: 'linux',
      arch: 'x64',
      nodeVersion: '22.0.0',
      nodeAbi: '131',
      logger: { info() {}, warn() {}, error() {} }
    });

    assert.strictEqual(result.action, 'copied');
    assert.strictEqual(fs.readFileSync(destBinary, 'utf8'), 'stub');
  });

  it('falls back when prebuilt is missing', () => {
    const tempRoot = makeTempDir();
    const moduleRoot = path.join(tempRoot, 'node_modules', 'better-sqlite3');
    fs.mkdirSync(moduleRoot, { recursive: true });

    const result = ensureBetterSqlite3({
      env: {},
      packageRoot: tempRoot,
      moduleRoot,
      prebuiltRoot: path.join(tempRoot, 'prebuilt', 'better-sqlite3'),
      platform: 'linux',
      arch: 'x64',
      nodeVersion: '22.0.0',
      nodeAbi: '131',
      logger: { info() {}, warn() {}, error() {} }
    });

    assert.strictEqual(result.action, 'fallback');
  });

  it('throws when force native is set and prebuilt is missing', () => {
    const tempRoot = makeTempDir();
    const moduleRoot = path.join(tempRoot, 'node_modules', 'better-sqlite3');
    fs.mkdirSync(moduleRoot, { recursive: true });

    assert.throws(() => {
      ensureBetterSqlite3({
        env: { UNITY_MCP_FORCE_NATIVE: '1' },
        packageRoot: tempRoot,
        moduleRoot,
        prebuiltRoot: path.join(tempRoot, 'prebuilt', 'better-sqlite3'),
        platform: 'linux',
        arch: 'x64',
        nodeVersion: '22.0.0',
        nodeAbi: '131',
        logger: { info() {}, warn() {}, error() {} }
      });
    }, /Prebuilt binary not found/);
  });

  it('skips when native preload is disabled', () => {
    const tempRoot = makeTempDir();
    const result = ensureBetterSqlite3({
      env: { UNITY_MCP_SKIP_NATIVE_BUILD: '1' },
      packageRoot: tempRoot,
      prebuiltRoot: path.join(tempRoot, 'prebuilt', 'better-sqlite3'),
      moduleRoot: path.join(tempRoot, 'node_modules', 'better-sqlite3'),
      platform: 'linux',
      arch: 'x64',
      nodeVersion: '22.0.0',
      nodeAbi: '131',
      logger: { info() {}, warn() {}, error() {} }
    });

    assert.strictEqual(result.action, 'skip');
  });
});
