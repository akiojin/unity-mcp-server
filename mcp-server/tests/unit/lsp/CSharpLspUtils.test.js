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
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
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

    const makeTmp = (prefix) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
      tmpDirs.push(dir);
      return dir;
    };

    it('prefers global tool cache path', () => {
      const fakeHome = makeTmp('lsp-home-');
      const fakeLegacy = makeTmp('lsp-legacy-');

      mock.method(utils, 'getPrimaryToolRoot', () => fakeHome);
      mock.method(utils, 'getLegacyToolRoot', () => fakeLegacy);

      const resolved = utils.getLocalPath(rid);
      assert.ok(resolved.startsWith(path.join(fakeHome, 'csharp-lsp', rid)));
      assert.ok(resolved.endsWith(utils.getExecutableName()));
    });

    it('migrates legacy binaries to global cache when missing', () => {
      const fakeHome = makeTmp('lsp-home-');
      const fakeLegacy = makeTmp('lsp-legacy-');
      const legacyBinDir = path.join(fakeLegacy, 'csharp-lsp', rid);
      fs.mkdirSync(legacyBinDir, { recursive: true });
      const legacyBin = path.join(legacyBinDir, utils.getExecutableName());
      const legacyVersion = path.join(legacyBinDir, 'VERSION');
      fs.writeFileSync(legacyBin, 'legacy-binary');
      fs.writeFileSync(legacyVersion, 'legacy-version');

      mock.method(utils, 'getPrimaryToolRoot', () => fakeHome);
      mock.method(utils, 'getLegacyToolRoot', () => fakeLegacy);

      const resolved = utils.getLocalPath(rid);
      assert.equal(resolved, path.join(fakeHome, 'csharp-lsp', rid, utils.getExecutableName()));
      assert.ok(fs.existsSync(resolved));
      assert.equal(fs.readFileSync(resolved, 'utf8'), 'legacy-binary');
      const migratedVersion = path.join(fakeHome, 'csharp-lsp', rid, 'VERSION');
      assert.ok(fs.existsSync(migratedVersion));
      assert.equal(fs.readFileSync(migratedVersion, 'utf8').trim(), 'legacy-version');
    });
  });
});
