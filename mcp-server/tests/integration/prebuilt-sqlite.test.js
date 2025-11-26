/**
 * T105: Prebuilt better-sqlite3 integration tests
 *
 * Tests for US-9: 初回起動高速化 (First startup acceleration)
 * - Clean install → 30 seconds or less startup
 * - Unsupported platform → WASM fallback
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { ensureBetterSqlite3, resolvePlatformKey } from '../../scripts/ensure-better-sqlite3.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '../..');
const PREBUILT_ROOT = path.join(PKG_ROOT, 'prebuilt', 'better-sqlite3');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ===== T105: postinstall performance test =====

test('postinstall completes within 5 seconds (prebuilt copy)', async () => {
  const workspace = tempDir('mcp-perf-');
  const prebuiltRoot = path.join(workspace, 'prebuilt');
  const bindingTarget = path.join(workspace, 'binding', 'better_sqlite3.node');

  // Create dummy prebuilt
  const platformKey = resolvePlatformKey();
  const prebuiltDir = path.join(prebuiltRoot, platformKey);
  fs.mkdirSync(prebuiltDir, { recursive: true });
  fs.writeFileSync(path.join(prebuiltDir, 'better_sqlite3.node'), 'dummy');

  const start = performance.now();

  const result = ensureBetterSqlite3({
    prebuiltRoot,
    bindingPath: bindingTarget,
    pkgRoot: workspace,
    skipNative: true,
    log: () => {},
    warn: () => {}
  });

  const elapsed = performance.now() - start;

  assert.equal(result.status, 'copied');
  assert.ok(elapsed < 5000, `postinstall took ${elapsed}ms, expected < 5000ms`);
});

// ===== T105: WASM fallback behavior =====

test('skips to WASM fallback when prebuilt missing and skipNative=true', () => {
  const workspace = tempDir('mcp-wasm-fallback-');
  const warnings = [];

  const result = ensureBetterSqlite3({
    prebuiltRoot: path.join(workspace, 'nonexistent-prebuilt'),
    bindingPath: path.join(workspace, 'binding', 'better_sqlite3.node'),
    pkgRoot: workspace,
    skipNative: true,
    forceNative: false,
    log: () => {},
    warn: msg => warnings.push(msg)
  });

  assert.equal(result.status, 'skipped');
  assert.ok(warnings.some(w => w.includes('sql.js fallback')));
});

// ===== T105: Actual prebuilt existence check =====

test('current platform prebuilt exists in package', () => {
  const platformKey = resolvePlatformKey();
  const prebuiltPath = path.join(PREBUILT_ROOT, platformKey, 'better_sqlite3.node');

  // This test checks if prebuilt for current platform is bundled
  // Skip if running on unsupported platform (CI may not have all platforms)
  if (!fs.existsSync(prebuiltPath)) {
    console.log(`[SKIP] No prebuilt for ${platformKey} - expected on some CI environments`);
    return;
  }

  const stat = fs.statSync(prebuiltPath);
  assert.ok(stat.size > 0, 'Prebuilt file should not be empty');
  assert.ok(stat.size > 1000, 'Prebuilt file should be a valid binary (> 1KB)');
});

// ===== T105: Platform matrix validation =====

test('all supported platforms have correct key format', () => {
  const platforms = ['linux', 'darwin', 'win32'];
  const archs = ['x64', 'arm64'];
  const nodeVersions = ['18.0.0', '20.0.0', '22.0.0'];

  for (const platform of platforms) {
    for (const arch of archs) {
      for (const nodeVersion of nodeVersions) {
        const key = resolvePlatformKey(nodeVersion, platform, arch);
        const expectedMajor = nodeVersion.split('.')[0];

        assert.ok(key.startsWith(`${platform}-${arch}-node`));
        assert.ok(key.endsWith(`node${expectedMajor}`));
      }
    }
  }
});

// ===== T105: Environment variable control =====

test('skipNative option respects UNITY_MCP_SKIP_NATIVE_BUILD semantics', () => {
  const workspace = tempDir('mcp-skip-native-');

  // When skipNative=true and no prebuilt, should skip without error
  const result = ensureBetterSqlite3({
    prebuiltRoot: path.join(workspace, 'no-prebuilt'),
    bindingPath: path.join(workspace, 'binding', 'better_sqlite3.node'),
    pkgRoot: workspace,
    skipNative: true,
    forceNative: false,
    log: () => {},
    warn: () => {}
  });

  assert.equal(result.status, 'skipped');
});
