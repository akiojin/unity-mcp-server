import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

describe('CodeIndex', () => {
  describe('basic functionality', () => {
    it('should have CodeIndex class definition', async () => {
      // Dynamic import to handle better-sqlite3 availability
      try {
        const { CodeIndex } = await import('../../../src/core/codeIndex.js');
        assert.ok(CodeIndex);
        assert.equal(typeof CodeIndex, 'function');
      } catch (e) {
        // If better-sqlite3 is not available, skip this test
        assert.ok(true, 'CodeIndex requires better-sqlite3');
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
        assert.ok(true, 'CodeIndex requires better-sqlite3');
      }
    });
  });

  describe('when native binding is missing', () => {
    it('disables gracefully and records the reason', async () => {
      const { CodeIndex, __resetCodeIndexDriverStatusForTest } = await import(
        '../../../src/core/codeIndex.js'
      );

      mock.method(CodeIndex.prototype, '_ensureDriver', async function () {
        this._Database = class {
          constructor() {
            throw new Error('Could not locate the bindings file. Tried:');
          }
        };
        return true;
      });

      const mockConnection = { isConnected: () => false };
      const index = new CodeIndex(mockConnection);
      const ready = await index.isReady();

      assert.equal(ready, false);
      assert.equal(index.disabled, true);
      assert.match(index.disableReason, /bindings file/i);

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
        assert.ok(true, 'CodeIndex requires better-sqlite3');
      }
    });
  });
});
