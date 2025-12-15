import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const ENV_KEYS = ['UNITY_PROJECT_ROOT'];

function snapshotEnv() {
  const out = {};
  for (const k of ENV_KEYS) out[k] = process.env[k];
  return out;
}

function restoreEnv(snapshot) {
  for (const k of ENV_KEYS) {
    const v = snapshot[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

async function importProjectInfoFresh() {
  const moduleUrl = new URL('../../../src/core/projectInfo.js', import.meta.url);
  moduleUrl.searchParams.set('ts', Date.now().toString());
  return import(moduleUrl.href);
}

describe('ProjectInfoProvider', () => {
  let envSnapshot;

  beforeEach(() => {
    envSnapshot = snapshotEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
  });

  it('returns cached value if available', async () => {
    const { ProjectInfoProvider } = await importProjectInfoFresh();
    const provider = new ProjectInfoProvider({
      isConnected: () => false,
      sendCommand: async () => ({})
    });

    const mockInfo = {
      projectRoot: '/test/project',
      assetsPath: '/test/project/Assets',
      packagesPath: '/test/project/Packages',
      codeIndexRoot: '/test/workspace/.unity/cache/code-index'
    };
    provider.cached = mockInfo;

    const result = await provider.get();
    assert.deepEqual(result, mockInfo);
  });

  it('uses UNITY_PROJECT_ROOT when provided', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unity-mcp-project-'));
    const projectDir = path.join(tmpDir, 'MyUnityProject');
    await fs.mkdir(path.join(projectDir, 'Assets'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'Packages'), { recursive: true });

    process.env.UNITY_PROJECT_ROOT = projectDir;

    try {
      const { ProjectInfoProvider } = await importProjectInfoFresh();
      const provider = new ProjectInfoProvider({
        isConnected: () => false,
        sendCommand: async () => ({})
      });

      const info = await provider.get();
      assert.equal(info.projectRoot, projectDir.replace(/\\/g, '/'));
      assert.equal(info.assetsPath, path.join(projectDir, 'Assets').replace(/\\/g, '/'));
      assert.equal(info.packagesPath, path.join(projectDir, 'Packages').replace(/\\/g, '/'));
      assert.match(info.codeIndexRoot, /\/\.unity\/cache\/code-index$/);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
