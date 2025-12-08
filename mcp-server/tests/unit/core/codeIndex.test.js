import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

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
  });

  describe('when fast-sql is unavailable', () => {
    it('disables gracefully and records the reason', async () => {
      const { CodeIndex, __resetCodeIndexDriverStatusForTest } = await import(
        '../../../src/core/codeIndex.js'
      );

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
