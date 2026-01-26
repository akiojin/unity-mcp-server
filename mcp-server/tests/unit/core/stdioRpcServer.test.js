import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StdioRpcServer } from '../../../src/core/stdioRpcServer.js';

function captureWrites(server) {
  const writes = [];
  server._enqueueWrite = message => {
    writes.push(message);
  };
  return writes;
}

function bufferFrom(obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  return Buffer.concat([body, Buffer.from('\n')]);
}

describe('StdioRpcServer', () => {
  it('validates request handler inputs', () => {
    const server = new StdioRpcServer();
    assert.throws(() => server.setRequestHandler(123, () => {}), /method must be a string/);
    assert.throws(() => server.setRequestHandler('ping', 'nope'), /handler must be a function/);
  });

  it('validates notification handler inputs', () => {
    const server = new StdioRpcServer();
    assert.throws(() => server.setNotificationHandler(123, () => {}), /method must be a string/);
    assert.throws(() => server.setNotificationHandler('notify', 'nope'), /handler must be a function/);
  });

  it('echoes the requested protocol version on initialize', async () => {
    const server = new StdioRpcServer();
    const writes = captureWrites(server);

    await server._handleMessage({
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: { tools: {} },
        clientInfo: { name: 'test-client', version: '0.0.1' }
      }
    });

    assert.equal(writes.length, 1);
    assert.equal(writes[0].result.protocolVersion, '2025-11-25');
    assert.deepEqual(writes[0].result.serverInfo, server.serverInfo);
  });

  it('falls back to default protocol when initialize has none', async () => {
    const server = new StdioRpcServer({ supportedProtocolVersions: ['2024-10-07'] });
    const writes = captureWrites(server);

    await server._handleMessage({ id: 2, method: 'initialize', params: {} });

    assert.equal(writes[0].result.protocolVersion, '2024-10-07');
  });

  it('returns method not found for unknown requests', async () => {
    const server = new StdioRpcServer();
    const writes = captureWrites(server);

    await server._handleMessage({ id: 3, method: 'unknown/method', params: {} });

    assert.equal(writes[0].error.code, -32601);
  });

  it('returns internal error when handler throws', async () => {
    const server = new StdioRpcServer();
    const writes = captureWrites(server);
    server.setRequestHandler('boom', () => {
      throw new Error('boom');
    });

    await server._handleMessage({ id: 4, method: 'boom', params: {} });

    assert.equal(writes[0].error.code, -32603);
    assert.match(writes[0].error.message, /boom/);
  });

  it('fires oninitialized for initialized notification', async () => {
    const server = new StdioRpcServer();
    let called = false;
    server.oninitialized = () => {
      called = true;
    };

    await server._handleMessage({ method: 'notifications/initialized', params: {} });

    assert.equal(called, true);
  });

  it('emits parse errors via onerror', async () => {
    const server = new StdioRpcServer();
    let error;
    server.onerror = err => {
      error = err;
    };

    server._handleChunk('{bad json\n');

    assert.ok(error instanceof Error);
  });

  it('emits notification handler errors via onerror', async () => {
    const server = new StdioRpcServer();
    let error;
    server.onerror = err => {
      error = err;
    };
    server.setNotificationHandler('notify/test', () => {
      throw new Error('notify failed');
    });

    await server._handleMessage({ method: 'notify/test', params: {} });

    assert.ok(error instanceof Error);
    assert.match(error.message, /notify failed/);
  });

  it('handles initialized notification errors via onerror', async () => {
    const server = new StdioRpcServer();
    let error;
    server.onerror = err => {
      error = err;
    };
    server.oninitialized = () => {
      throw new Error('init failed');
    };

    await server._handleMessage({ method: 'notifications/initialized', params: {} });

    assert.ok(error instanceof Error);
    assert.match(error.message, /init failed/);
  });

  it('handles chunked newline-delimited messages', async () => {
    const server = new StdioRpcServer();
    const writes = captureWrites(server);

    server._handleChunk(bufferFrom({ id: 10, method: 'initialize', params: {} }));
    server._handleChunk(bufferFrom({ id: 11, method: 'unknown', params: {} }));

    assert.equal(writes.length, 2);
    assert.equal(writes[0].id, 10);
    assert.equal(writes[1].error.code, -32601);
  });

  it('sends notifications with jsonrpc envelope', () => {
    const server = new StdioRpcServer();
    const writes = captureWrites(server);

    server.sendNotification('notifications/message', { level: 'info', data: 'hi' });

    assert.equal(writes.length, 1);
    assert.equal(writes[0].jsonrpc, '2.0');
    assert.equal(writes[0].method, 'notifications/message');
  });
});
