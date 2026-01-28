import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { LspRpcClient } from '../../../src/lsp/LspRpcClient.js';

const createMockProc = ({ stdinWritable = true } = {}) => {
  const proc = new EventEmitter();
  proc.killed = false;

  const stdout = new EventEmitter();
  const stderr = new EventEmitter();

  proc.stdout = stdout;
  proc.stderr = stderr;

  proc.stdin = {
    destroyed: !stdinWritable,
    writableEnded: !stdinWritable,
    write() {},
    end() {
      this.writableEnded = true;
    }
  };

  return proc;
};

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

    it('should restart when cached process stdin is not writable', async () => {
      const invalidProc = createMockProc({ stdinWritable: false });
      const validProc = createMockProc({ stdinWritable: true });

      client.proc = invalidProc;
      client.initialized = true;
      client.initialize = async () => {
        client.initialized = true;
        return {};
      };

      let stopCalls = 0;
      let ensureCalls = 0;
      client.mgr = {
        async ensureStarted() {
          ensureCalls += 1;
          return validProc;
        },
        async stop() {
          stopCalls += 1;
        }
      };

      const proc = await client.ensure();

      assert.equal(proc, validProc);
      assert.equal(stopCalls, 1);
      assert.equal(ensureCalls, 1);
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
