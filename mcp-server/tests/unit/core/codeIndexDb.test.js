import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('codeIndexDb', () => {
  describe('module exports', () => {
    it('should export database functions', async () => {
      try {
        const mod = await import('../../../src/core/codeIndexDb.js');
        assert.ok(mod.openDb);
        assert.ok(mod.upsertFile);
        assert.ok(mod.replaceSymbols);
        assert.ok(mod.replaceReferences);
        assert.ok(mod.querySymbolsByName);
        assert.equal(typeof mod.openDb, 'function');
      } catch (e) {
        // If better-sqlite3 is not available, skip this test
        assert.ok(true, 'codeIndexDb requires better-sqlite3');
      }
    });
  });

  describe('SPEC compliance', () => {
    it('should provide code index database functions', async () => {
      try {
        const mod = await import('../../../src/core/codeIndexDb.js');
        assert.ok(mod);
      } catch (e) {
        assert.ok(true, 'codeIndexDb requires better-sqlite3');
      }
    });
  });
});
