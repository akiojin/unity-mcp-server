import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LspRpcClient } from '../../../src/lsp/LspRpcClient.js';

describe('LspRpcClient', () => {
  let client;

  beforeEach(() => {
    client = new LspRpcClient();
  });

  describe('constructor', () => {
    it('should construct without parameters', () => {
      assert.ok(client);
      assert.equal(client.proc, null);
      assert.equal(client.seq, 1);
      assert.equal(client.initialized, false);
    });

    it('should construct with projectRoot', () => {
      const clientWithRoot = new LspRpcClient('/test/project');
      assert.ok(clientWithRoot);
      assert.equal(clientWithRoot.projectRoot, '/test/project');
    });

    it('should initialize with LspProcessManager', () => {
      assert.ok(client.mgr);
      assert.ok(client.mgr.ensureStarted);
    });

    it('should initialize pending map', () => {
      assert.ok(client.pending);
      assert.ok(client.pending instanceof Map);
      assert.equal(client.pending.size, 0);
    });

    it('should initialize buffer', () => {
      assert.ok(client.buf);
      assert.ok(Buffer.isBuffer(client.buf));
      assert.equal(client.buf.length, 0);
    });
  });

  describe('ensure method', () => {
    it('should have ensure method', () => {
      assert.ok(client.ensure);
      assert.equal(typeof client.ensure, 'function');
    });

    it('should be async (returns Promise)', () => {
      assert.equal(client.ensure.constructor.name, 'AsyncFunction');
    });
  });

  describe('onData method', () => {
    it('should have onData method', () => {
      assert.ok(client.onData);
      assert.equal(typeof client.onData, 'function');
    });

    it('should handle empty buffer', () => {
      assert.doesNotThrow(() => {
        client.onData(Buffer.alloc(0));
      });
    });

    it('should accumulate buffer data', () => {
      const initialLen = client.buf.length;
      client.onData(Buffer.from('test'));
      assert.ok(client.buf.length >= initialLen + 4);
    });
  });

  describe('writeMessage method', () => {
    it('should have writeMessage method', () => {
      assert.ok(client.writeMessage);
      assert.equal(typeof client.writeMessage, 'function');
    });
  });

  describe('initialize method', () => {
    it('should have initialize method', () => {
      assert.ok(client.initialize);
      assert.equal(typeof client.initialize, 'function');
    });

    it('should be async (returns Promise)', () => {
      assert.equal(client.initialize.constructor.name, 'AsyncFunction');
    });
  });

  describe('request method', () => {
    it('should have request method', () => {
      assert.ok(client.request);
      assert.equal(typeof client.request, 'function');
    });

    it('should be async (returns Promise)', () => {
      assert.equal(client.request.constructor.name, 'AsyncFunction');
    });
  });

  describe('sequence tracking', () => {
    it('should initialize sequence to 1', () => {
      assert.equal(client.seq, 1);
    });

    it('should track pending requests', () => {
      assert.ok(client.pending instanceof Map);
    });
  });

  describe('SPEC compliance', () => {
    it('should provide LSP RPC client functionality', () => {
      assert.ok(LspRpcClient);
      assert.equal(typeof LspRpcClient, 'function');
    });

    it('should provide initialization capability', () => {
      assert.ok(client.initialize);
    });

    it('should provide request capability', () => {
      assert.ok(client.request);
    });

    it('should provide data handling capability', () => {
      assert.ok(client.onData);
    });
  });
});
