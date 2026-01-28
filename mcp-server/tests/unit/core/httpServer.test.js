import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { createHttpServer } from '../../../src/core/httpServer.js';

const makeHandler = () => ({
  name: 'echo',
  getDefinition: () => ({ name: 'echo', description: 'echo', inputSchema: { type: 'object' } }),
  handle: async args => ({ status: 'ok', result: args })
});

describe('httpServer', () => {
  let server;
  let started = false;

  afterEach(async () => {
    if (server) {
      if (started) {
        try {
          await server.close();
        } catch {}
      }
      server = null;
      started = false;
    }
  });

  it('handles JSON-RPC callTool via /rpc', async () => {
    const handlers = new Map();
    handlers.set('echo', makeHandler());
    server = createHttpServer({ handlers, port: 0 });
    const port = await server.start();
    started = true;

    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'echo', arguments: { a: 1 } }
    };
    const res = await fetch(`http://127.0.0.1:${port}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.result, { status: 'ok', result: { a: 1 } });
  });

  it('fails to start when port is already in use (EADDRINUSE)', async () => {
    // occupy a port
    const blocker = net.createServer();
    await new Promise((resolve, reject) =>
      blocker.listen(0, '127.0.0.1', err => (err ? reject(err) : resolve()))
    );
    const port = blocker.address().port;

    const handlers = new Map();
    handlers.set('echo', makeHandler());
    server = createHttpServer({ handlers, port, host: '127.0.0.1' });
    await assert.rejects(() => server.start(), /EADDRINUSE/);

    await new Promise((resolve, reject) => blocker.close(err => (err ? reject(err) : resolve())));
  });
});
