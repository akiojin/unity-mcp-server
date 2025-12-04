import { InstanceRegistry } from '../../core/instanceRegistry.js';

export async function setActive({ id, registry }) {
  const reg = registry || new InstanceRegistry();
  return reg.setActive(id, { timeoutMs: 1000 });
}
