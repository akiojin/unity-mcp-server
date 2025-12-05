import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpServer } from '../../src/core/httpServer.js';

const dummyHandlers = () => new Map();

describe('HTTP health contract', () => {
  let server;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('returns 200 with ok status and telemetry flag', async () => {
    server = createHttpServer({ handlers: dummyHandlers(), telemetryEnabled: false, port: 0 });
    const port = await server.start();

    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.mode, 'http');
    assert.equal(body.telemetryEnabled, false);
    assert.equal(body.port, port);
  });
});
