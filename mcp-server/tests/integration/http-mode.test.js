import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpServer } from '../../src/core/httpServer.js';

const handlers = new Map();
handlers.set('ping', {
  name: 'ping',
  getDefinition: () => ({ name: 'ping', description: 'ping', inputSchema: { type: 'object' } }),
  handle: async () => ({ status: 'ok', result: { pong: true } })
});

describe('HTTP mode integration', () => {
  let server;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('lists tools and calls tool over HTTP', async () => {
    server = createHttpServer({ handlers, port: 0, telemetryEnabled: false });
    const port = await server.start();

    const listRes = await fetch(`http://127.0.0.1:${port}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.result.tools.length, 1);

    const callRes = await fetch(`http://127.0.0.1:${port}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'ping', arguments: {} }
      })
    });
    assert.equal(callRes.status, 200);
    const callBody = await callRes.json();
    assert.deepEqual(callBody.result, { status: 'ok', result: { pong: true } });
  });
});
