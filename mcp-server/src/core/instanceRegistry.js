import net from 'node:net';

async function ping(host, port, timeoutMs = 1000) {
  return new Promise(resolve => {
    const socket = net.connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.end();
      resolve(true);
    });
    socket.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

export class InstanceRegistry {
  constructor(entries = []) {
    this.entries = [];
    this.activeId = null;
    entries.forEach(e => this.add(e));
  }

  add(entry) {
    const id = entry.id || `${entry.host}:${entry.port}`;
    if (this.entries.find(e => e.id === id)) return;
    this.entries.push({
      id,
      host: entry.host,
      port: entry.port,
      status: entry.status || 'unknown',
      lastCheckedAt: entry.lastCheckedAt,
      active: false
    });
  }

  remove(id) {
    this.entries = this.entries.filter(e => e.id !== id);
  }

  list() {
    return this.entries.map(e => ({ ...e, active: e.id === this.activeId }));
  }

  async refreshStatus(timeoutMs = 1000) {
    for (const entry of this.entries) {
      const ok = await ping(entry.host, entry.port, timeoutMs);
      entry.status = ok ? 'up' : 'down';
      entry.lastCheckedAt = new Date().toISOString();
    }
    return this.list();
  }

  async setActive(id, { timeoutMs = 1000 } = {}) {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) throw new Error(`Instance not found: ${id}`);

    const ok = await ping(entry.host, entry.port, timeoutMs);
    if (!ok) throw new Error(`Instance unreachable: ${id}`);

    const previousId = this.activeId;
    this.activeId = id;
    entry.status = 'up';
    entry.lastCheckedAt = new Date().toISOString();
    return { activeId: id, previousId };
  }
}
