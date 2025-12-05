import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { InstanceRegistry } from '../../../src/core/instanceRegistry.js';

function startTcpServer() {
  const server = net.createServer(socket => {
    socket.end();
  });
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', err => {
      if (err) return reject(err);
      resolve({ server, port: server.address().port });
    });
  });
}

describe('InstanceRegistry', () => {
  let tcpA;
  let tcpB;

  beforeEach(async () => {
    tcpA = await startTcpServer();
    tcpB = await startTcpServer();
  });

  afterEach(async () => {
    for (const s of [tcpA?.server, tcpB?.server]) {
      if (s) await new Promise(res => s.close(() => res()));
    }
  });

  it('lists entries with active flag', async () => {
    const registry = new InstanceRegistry([
      { host: '127.0.0.1', port: tcpA.port },
      { host: '127.0.0.1', port: tcpB.port }
    ]);
    await registry.setActive(`127.0.0.1:${tcpA.port}`);
    const list = registry.list();
    const active = list.find(e => e.active);
    assert.equal(active.id, `127.0.0.1:${tcpA.port}`);
  });

  it('rejects setActive when unreachable', async () => {
    const registry = new InstanceRegistry([
      { host: '127.0.0.1', port: tcpA.port },
      { host: '127.0.0.1', port: 65001 }
    ]);
    await assert.rejects(() => registry.setActive('127.0.0.1:65001'), /unreachable/);
  });
});
