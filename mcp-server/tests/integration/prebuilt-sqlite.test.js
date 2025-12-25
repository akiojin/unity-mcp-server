import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'unity-mcp-prebuilt-'));
}

describe('prebuilt better-sqlite3 installer', () => {
  it('copies a matching prebuilt binary into node_modules', () => {
    const tempRoot = makeTempDir();
    const platformKey = 'linux-x64-node22';
    const prebuiltDir = path.join(tempRoot, 'prebuilt', 'better-sqlite3', platformKey);
    const moduleRoot = path.join(tempRoot, 'node_modules', 'better-sqlite3');
    const destBinary = path.join(moduleRoot, 'build', 'Release', 'better_sqlite3.node');

    fs.mkdirSync(prebuiltDir, { recursive: true });
    fs.mkdirSync(path.dirname(destBinary), { recursive: true });
    fs.writeFileSync(path.join(prebuiltDir, 'better_sqlite3.node'), 'stub');

    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const scriptPath = path.resolve(testDir, '../../scripts/ensure-better-sqlite3.mjs');
    const repoRoot = path.resolve(testDir, '../../..');
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        UNITY_MCP_PACKAGE_ROOT: tempRoot,
        UNITY_MCP_PLATFORM: 'linux',
        UNITY_MCP_ARCH: 'x64',
        UNITY_MCP_NODE_MAJOR: '22',
        UNITY_MCP_NODE_ABI: '131',
        UNITY_MCP_SKIP_BIN_CHMOD: '1'
      },
      encoding: 'utf8'
    });

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.strictEqual(fs.readFileSync(destBinary, 'utf8'), 'stub');
  });
});
