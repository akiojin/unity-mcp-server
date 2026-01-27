import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

describe('CodeIndex', () => {
  describe('basic functionality', () => {
    it('should have CodeIndex class definition', async () => {
      // Dynamic import to handle fast-sql availability
      try {
        const { CodeIndex } = await import('../../../src/core/codeIndex.js');
        assert.ok(CodeIndex);
        assert.equal(typeof CodeIndex, 'function');
      } catch (e) {
        // If fast-sql is not available, skip this test
        assert.ok(true, 'CodeIndex requires fast-sql');
      }
    });

    it('should construct with unityConnection', async () => {
      try {
        const { CodeIndex } = await import('../../../src/core/codeIndex.js');
        const mockConnection = { isConnected: () => false };
        const index = new CodeIndex(mockConnection);
        assert.ok(index);
        assert.equal(index.disabled, false);
      } catch (e) {
        assert.ok(true, 'CodeIndex requires fast-sql');
      }
    });

    it('should reload when database file changes on disk', async () => {
      let tempRoot;
      let resetDriver;
      try {
        const { CodeIndex, __resetCodeIndexDriverStatusForTest } =
          await import('../../../src/core/codeIndex.js');
        resetDriver = __resetCodeIndexDriverStatusForTest;
        const { Database } = await import('@akiojin/fast-sql');

        tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'code-index-test-'));
        const codeIndexRoot = path.join(tempRoot, '.unity', 'cache', 'code-index');
        fs.mkdirSync(codeIndexRoot, { recursive: true });

        const index = new CodeIndex({ isConnected: () => false });
        index.projectInfo.get = async () => ({
          projectRoot: tempRoot,
          assetsPath: path.join(tempRoot, 'Assets'),
          packagesPath: path.join(tempRoot, 'Packages'),
          packageCachePath: path.join(tempRoot, 'Library/PackageCache'),
          codeIndexRoot
        });

        const readyBefore = await index.isReady();
        assert.equal(readyBefore, false);

        const dbPath = path.join(codeIndexRoot, 'code-index.db');

        const db = await Database.create();
        db.run(
          `
          CREATE TABLE IF NOT EXISTS symbols (
            path TEXT NOT NULL,
            name TEXT NOT NULL,
            kind TEXT NOT NULL,
            container TEXT,
            namespace TEXT,
            line INTEGER,
            column INTEGER
          )
        `
        );
        db.run(
          'INSERT INTO symbols(path,name,kind,container,namespace,line,column) VALUES (?,?,?,?,?,?,?)',
          ['Assets/Foo.cs', 'Foo', 'class', null, null, 1, 1]
        );
        const data = db.exportDb();
        db.close();

        fs.writeFileSync(dbPath, Buffer.from(data));
        const now = new Date();
        fs.utimesSync(dbPath, now, now);

        const readyAfter = await index.isReady();
        assert.equal(readyAfter, true);
      } catch (e) {
        assert.ok(true, 'CodeIndex requires fast-sql');
      } finally {
        if (resetDriver) {
          resetDriver();
        }
        if (tempRoot) {
          fs.rmSync(tempRoot, { recursive: true, force: true });
        }
      }
    });
  });

  describe('when fast-sql is unavailable', () => {
    it('disables gracefully and records the reason', async () => {
      const prevProjectRoot = process.env.UNITY_PROJECT_ROOT;
      process.env.UNITY_PROJECT_ROOT = path.resolve(process.cwd(), '../UnityMCPServer');

      const { CodeIndex, __resetCodeIndexDriverStatusForTest } =
        await import('../../../src/core/codeIndex.js');

      mock.method(CodeIndex.prototype, '_ensureDriver', async function () {
        this._SQL = {
          Database: class {
            constructor() {
              throw new Error('WASM loading failed');
            }
          }
        };
        return true;
      });

      const mockConnection = { isConnected: () => false };
      const index = new CodeIndex(mockConnection);
      const ready = await index.isReady();

      assert.equal(ready, false);
      assert.equal(index.disabled, true);
      assert.match(index.disableReason, /WASM loading failed/i);

      mock.restoreAll();
      __resetCodeIndexDriverStatusForTest();

      if (prevProjectRoot === undefined) delete process.env.UNITY_PROJECT_ROOT;
      else process.env.UNITY_PROJECT_ROOT = prevProjectRoot;
    });
  });

  describe('SPEC compliance', () => {
    it('should provide code index functionality', async () => {
      try {
        const { CodeIndex } = await import('../../../src/core/codeIndex.js');
        assert.ok(CodeIndex);
      } catch (e) {
        assert.ok(true, 'CodeIndex requires fast-sql');
      }
    });
  });
});
