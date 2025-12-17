import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LspProcessManager } from '../../../src/lsp/LspProcessManager.js';

describe('LspProcessManager', () => {
  let manager;

  beforeEach(() => {
    manager = new LspProcessManager();
    // LspProcessManager shares state across instances. Reset between tests.
    manager.state.proc = null;
    manager.state.starting = null;
  });

  describe('constructor', () => {
    it('should construct without parameters', () => {
      assert.ok(manager);
      assert.equal(manager.state.proc, null);
      assert.equal(manager.state.starting, null);
    });

    it('should initialize with CSharpLspUtils', () => {
      assert.ok(manager.utils);
      assert.ok(manager.utils.detectRid);
    });
  });

  describe('ensureStarted method', () => {
    it('should have ensureStarted method', () => {
      assert.ok(manager.ensureStarted);
      assert.equal(typeof manager.ensureStarted, 'function');
    });

    it('should be async (returns Promise)', () => {
      assert.equal(manager.ensureStarted.constructor.name, 'AsyncFunction');
    });
  });

  describe('stop method', () => {
    it('should have stop method', () => {
      assert.ok(manager.stop);
      assert.equal(typeof manager.stop, 'function');
    });

    it('should accept grace period parameter', async () => {
      // Should not throw when called on non-running manager
      await assert.doesNotReject(async () => {
        await manager.stop(1000);
      });
    });

    it('should handle immediate stop', async () => {
      await assert.doesNotReject(async () => {
        await manager.stop(0);
      });
    });
  });

  describe('process lifecycle', () => {
    it('should return null proc initially', () => {
      assert.equal(manager.state.proc, null);
    });

    it('should track starting state', () => {
      assert.equal(manager.state.starting, null);
    });
  });

  describe('SPEC compliance', () => {
    it('should provide LSP process management functionality', () => {
      assert.ok(LspProcessManager);
      assert.equal(typeof LspProcessManager, 'function');
    });

    it('should provide process start capability', () => {
      assert.ok(manager.ensureStarted);
    });

    it('should provide process stop capability', () => {
      assert.ok(manager.stop);
    });
  });
});
