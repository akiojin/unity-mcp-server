import { InstanceRegistry } from '../../core/instanceRegistry.js';

export async function listInstances({ ports, host = 'localhost', registry }) {
  const reg = registry || new InstanceRegistry();
  if (Array.isArray(ports)) {
    ports.forEach(p => reg.add({ host, port: Number(p) }));
  }
  await reg.refreshStatus();
  return reg.list();
}
