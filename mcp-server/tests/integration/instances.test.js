import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { listInstances } from '../../src/cli/commands/listInstances.js';
import { setActive } from '../../src/cli/commands/setActive.js';
import { InstanceRegistry } from '../../src/core/instanceRegistry.js';

function startTcpServer() {
  const server = net.createServer(socket => socket.end());
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', err => (err ? reject(err) : resolve({ server, port: server.address().port })));
  });
}

describe('instances CLI integration', () => {
  let tcpA;
  let tcpB;
  let registry;

  beforeEach(async () => {
    tcpA = await startTcpServer();
    tcpB = await startTcpServer();
    registry = new InstanceRegistry([
      { host: '127.0.0.1', port: tcpA.port },
      { host: '127.0.0.1', port: tcpB.port }
    ]);
  });

  afterEach(async () => {
    for (const s of [tcpA?.server, tcpB?.server]) {
      if (s) await new Promise(res => s.close(() => res()));
    }
  });

  it('lists and sets active instance', async () => {
    const list = await listInstances({ ports: [tcpA.port, tcpB.port], host: '127.0.0.1', registry });
    assert.equal(list.length, 2);
    await setActive({ id: `127.0.0.1:${tcpB.port}`, registry });
    const after = registry.list();
    const active = after.find(e => e.active);
    assert.equal(active.id, `127.0.0.1:${tcpB.port}`);
  });

  it('fails set-active when unreachable', async () => {
    await registry.remove(`127.0.0.1:${tcpB.port}`);
    registry.add({ host: '127.0.0.1', port: 65010 });
    await assert.rejects(() => setActive({ id: '127.0.0.1:65010', registry }), /unreachable/);
  });
});
