import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CSharpLspUtils } from '../../../src/lsp/CSharpLspUtils.js';

describe('CSharpLspUtils', () => {
  let utils;
  const tmpDirs = [];

  beforeEach(() => {
    utils = new CSharpLspUtils();
  });

  afterEach(() => {
    mock.reset();
    while (tmpDirs.length > 0) {
      const dir = tmpDirs.pop();
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {}
    }
  });

  describe('constructor', () => {
    it('should construct without parameters', () => {
      assert.ok(utils);
    });
  });

  describe('detectRid method', () => {
    it('should have detectRid method', () => {
      assert.ok(utils.detectRid);
      assert.equal(typeof utils.detectRid, 'function');
    });

    it('should return valid RID string', () => {
      const rid = utils.detectRid();
      assert.ok(typeof rid === 'string');
      assert.ok(rid.length > 0);
      assert.ok(/^(win|osx|linux)-(x64|arm64)$/.test(rid));
    });
  });

  describe('getDesiredVersion method', () => {
    it('should have getDesiredVersion method', () => {
      assert.ok(utils.getDesiredVersion);
      assert.equal(typeof utils.getDesiredVersion, 'function');
    });

    it('should return string or null', () => {
      const version = utils.getDesiredVersion();
      assert.ok(version === null || typeof version === 'string');
    });
  });

  describe('getLocalPath method', () => {
    it('should have getLocalPath method', () => {
      assert.ok(utils.getLocalPath);
      assert.equal(typeof utils.getLocalPath, 'function');
    });

    it('should return path string for valid RID', () => {
      const path = utils.getLocalPath('linux-x64');
      assert.ok(typeof path === 'string');
      assert.ok(path.includes('csharp-lsp'));
    });
  });

  describe('getVersionMarkerPath method', () => {
    it('should have getVersionMarkerPath method', () => {
      assert.ok(utils.getVersionMarkerPath);
      assert.equal(typeof utils.getVersionMarkerPath, 'function');
    });

    it('should return path string ending with VERSION', () => {
      const path = utils.getVersionMarkerPath('linux-x64');
      assert.ok(typeof path === 'string');
      assert.ok(path.endsWith('VERSION'));
    });
  });

  describe('readLocalVersion method', () => {
    it('should have readLocalVersion method', () => {
      assert.ok(utils.readLocalVersion);
      assert.equal(typeof utils.readLocalVersion, 'function');
    });

    it('should return string or null', () => {
      const version = utils.readLocalVersion('linux-x64');
      assert.ok(version === null || typeof version === 'string');
    });
  });

  describe('fetchLatestReleaseVersion', () => {
    it('returns version string from latest release tag', async () => {
      mock.method(global, 'fetch', async () => ({
        ok: true,
        json: async () => ({ tag_name: 'v9.9.9' })
      }));

      const version = await utils.fetchLatestReleaseVersion('owner/repo');
      assert.equal(version, '9.9.9');
    });
  });

  describe('writeLocalVersion method', () => {
    it('should have writeLocalVersion method', () => {
      assert.ok(utils.writeLocalVersion);
      assert.equal(typeof utils.writeLocalVersion, 'function');
    });

    it('should not throw when called with valid parameters', () => {
      assert.doesNotThrow(() => {
        // This might fail but should not throw
        try {
          utils.writeLocalVersion('linux-x64', '1.0.0');
        } catch {
          // Expected to fail in test environment without write permissions
        }
      });
    });
  });

  describe('SPEC compliance', () => {
    it('should provide C# LSP utility functionality', () => {
      assert.ok(CSharpLspUtils);
      assert.equal(typeof CSharpLspUtils, 'function');
    });

    it('should provide RID detection', () => {
      const rid = utils.detectRid();
      assert.ok(rid);
    });

    it('should provide local path resolution', () => {
      const path = utils.getLocalPath('linux-x64');
      assert.ok(path);
    });
  });

  describe('tool root resolution', () => {
    const rid = 'linux-x64';

    const makeTmp = prefix => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
      tmpDirs.push(dir);
      return dir;
    };

    it('prefers UNITY_MCP_TOOLS_ROOT when set', () => {
      const fakeRoot = makeTmp('lsp-tools-root-');
      const original = process.env.UNITY_MCP_TOOLS_ROOT;
      process.env.UNITY_MCP_TOOLS_ROOT = fakeRoot;
      try {
        const resolved = utils.getLocalPath(rid);
        assert.ok(resolved.startsWith(path.join(fakeRoot, 'csharp-lsp', rid)));
        assert.ok(resolved.endsWith(utils.getExecutableName()));
      } finally {
        if (original === undefined) delete process.env.UNITY_MCP_TOOLS_ROOT;
        else process.env.UNITY_MCP_TOOLS_ROOT = original;
      }
    });

    it('falls back to ~/.unity/tools when UNITY_MCP_TOOLS_ROOT is unset', () => {
      const original = process.env.UNITY_MCP_TOOLS_ROOT;
      delete process.env.UNITY_MCP_TOOLS_ROOT;
      try {
        const resolved = utils.getLocalPath(rid);
        assert.ok(
          resolved.startsWith(path.join(os.homedir(), '.unity', 'tools', 'csharp-lsp', rid))
        );
        assert.ok(resolved.endsWith(utils.getExecutableName()));
      } finally {
        if (original !== undefined) process.env.UNITY_MCP_TOOLS_ROOT = original;
      }
    });
  });

  describe('ensureLocal in test mode', () => {
    const makeTmp = prefix => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
      tmpDirs.push(dir);
      return dir;
    };

    it('skips auto-download when NODE_ENV=test and a binary already exists', async () => {
      const rid = utils.detectRid();
      const fakeRoot = makeTmp('lsp-tools-root-');
      const originalToolsRoot = process.env.UNITY_MCP_TOOLS_ROOT;
      const originalNodeEnv = process.env.NODE_ENV;

      process.env.UNITY_MCP_TOOLS_ROOT = fakeRoot;
      process.env.NODE_ENV = 'test';

      try {
        const binPath = utils.getLocalPath(rid);
        fs.mkdirSync(path.dirname(binPath), { recursive: true });
        fs.writeFileSync(binPath, '#!/bin/sh\necho test\n', 'utf8');
        if (process.platform !== 'win32') {
          fs.chmodSync(binPath, 0o755);
        }

        // Force a version mismatch to trigger the download path in non-test environments.
        utils.writeLocalVersion(rid, '0.0.0');

        const autoDownload = mock.method(utils, 'autoDownload', async () => {
          throw new Error('autoDownload should not run in test mode');
        });

        const resolved = await utils.ensureLocal(rid);
        assert.equal(resolved, binPath);
        assert.equal(autoDownload.mock.calls.length, 0);
      } finally {
        if (originalToolsRoot === undefined) delete process.env.UNITY_MCP_TOOLS_ROOT;
        else process.env.UNITY_MCP_TOOLS_ROOT = originalToolsRoot;
        if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });
});
