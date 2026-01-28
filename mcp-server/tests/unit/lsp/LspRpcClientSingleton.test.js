import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { LspRpcClientSingleton } from '../../../src/lsp/LspRpcClientSingleton.js';
import { LspRpcClient } from '../../../src/lsp/LspRpcClient.js';

describe('LspRpcClientSingleton', () => {
  afterEach(async () => {
    mock.reset();
    await LspRpcClientSingleton.reset();
  });

  it('uses mcp/ping for heartbeat', async () => {
    const originalSetInterval = global.setInterval;
    const originalClearInterval = global.clearInterval;
    const calls = [];

    mock.method(LspRpcClient.prototype, 'request', async (method, params) => {
      calls.push({ method, params });
      return {};
    });

    let heartbeatFn;
    global.setInterval = (fn, _ms) => {
      heartbeatFn = fn;
      return 1;
    };
    global.clearInterval = () => {};

    try {
      const instance = await LspRpcClientSingleton.getInstance('/tmp');
      instance.proc = { killed: false };
      await heartbeatFn();
      assert.ok(calls.some(call => call.method === 'mcp/ping'));
    } finally {
      global.setInterval = originalSetInterval;
      global.clearInterval = originalClearInterval;
    }
  });

  it('creates isolated validation instance', async () => {
    const main = await LspRpcClientSingleton.getInstance('/tmp');
    const validation = await LspRpcClientSingleton.getValidationInstance('/tmp');

    assert.notEqual(main, validation);
    assert.notEqual(main.mgr, validation.mgr);
  });
});
