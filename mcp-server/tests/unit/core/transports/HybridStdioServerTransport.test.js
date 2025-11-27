import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { HybridStdioServerTransport } from '../../../../src/core/transports/HybridStdioServerTransport.js';

function waitForMicrotask() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('HybridStdioServerTransport', () => {
  let stdin;
  let stdout;
  let transport;
  let received;
  let written;

  beforeEach(async () => {
    stdin = new PassThrough();
    stdout = new PassThrough();
    received = [];
    written = [];

    stdout.on('data', chunk => {
      written.push(chunk);
    });

    transport = new HybridStdioServerTransport(stdin, stdout);
    transport.onmessage = message => received.push(message);
    await transport.start();
  });

  afterEach(async () => {
    await transport.close();
  });

  it('parses Content-Length framed messages and responds with Content-Length', async () => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'ping'
    });
    stdin.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);

    await waitForMicrotask();

    assert.equal(received.length, 1);
    assert.equal(received[0].method, 'ping');
    assert.equal(transport.framingMode, 'content-length');

    await transport.send({ jsonrpc: '2.0', id: 1, result: {} });
    const output = Buffer.concat(written).toString('utf8');
    assert.match(output, /^Content-Length: \d+\r\n\r\n/);
  });

  it('parses NDJSON framed messages and responds without headers', async () => {
    stdin.write('{"jsonrpc":"2.0","id":2,"method":"ping"}\n');

    await waitForMicrotask();

    assert.equal(received.length, 1);
    assert.equal(received[0].id, 2);
    assert.equal(transport.framingMode, 'ndjson');

    await transport.send({ jsonrpc: '2.0', id: 2, result: {} });
    const output = Buffer.concat(written).toString('utf8');
    assert.doesNotMatch(output, /^Content-Length:/);
    assert.ok(output.trimEnd().endsWith('}'));
  });

  it('accepts Content-Length headers terminated with LF only', async () => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 10,
      method: 'ping'
    });
    stdin.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\n\n${body}`);

    await waitForMicrotask();

    assert.equal(received.length, 1);
    assert.equal(received[0].id, 10);
    assert.equal(transport.framingMode, 'content-length');
  });

  it('handles chunked Content-Length headers', async () => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping' });
    const chunkA = 'Content-Len';
    const chunkB = `gth: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
    stdin.write(chunkA);
    await waitForMicrotask();
    assert.equal(received.length, 0);

    stdin.write(chunkB);
    await waitForMicrotask();

    assert.equal(received.length, 1);
    assert.equal(received[0].id, 3);
    assert.equal(transport.framingMode, 'content-length');
  });
});
