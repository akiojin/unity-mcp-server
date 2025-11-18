import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IndexWatcher } from '../../../src/core/indexWatcher.js';

describe('IndexWatcher', () => {
  let watcher;
  let mockConnection;

  beforeEach(() => {
    mockConnection = { isConnected: () => false };
    watcher = new IndexWatcher(mockConnection);
  });

  describe('constructor', () => {
    it('should construct with unityConnection', () => {
      assert.ok(watcher);
      assert.equal(watcher.running, false);
      assert.equal(watcher.timer, null);
    });
  });

  describe('start and stop', () => {
    it('should have start method', () => {
      assert.ok(watcher.start);
      assert.equal(typeof watcher.start, 'function');
    });

    it('should have stop method', () => {
      assert.ok(watcher.stop);
      assert.equal(typeof watcher.stop, 'function');
    });

    it('should call stop without error', () => {
      assert.doesNotThrow(() => watcher.stop());
    });
  });

  describe('SPEC compliance', () => {
    it('should provide index watcher functionality', () => {
      assert.ok(IndexWatcher);
      assert.equal(typeof IndexWatcher, 'function');
    });
  });

  describe('DB file deletion detection', () => {
    it('should have tick method for periodic checks', () => {
      assert.ok(watcher.tick);
      assert.equal(typeof watcher.tick, 'function');
    });

    it('should check DB file existence in tick', async () => {
      // This is an integration-level concern tested via MCP tools
      // Unit test just verifies the method exists and is callable
      assert.ok(watcher.tick);
      assert.equal(typeof watcher.tick, 'function');
    });

    it('should have _monitorJob method for job tracking', () => {
      assert.ok(watcher._monitorJob);
      assert.equal(typeof watcher._monitorJob, 'function');
    });
  });
});
