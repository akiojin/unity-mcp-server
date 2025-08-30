import { WriteQueue } from './writeQueue.js';
import { config } from './config.js';

let globalQueue = null;

export function getWriteQueue(unityConnection) {
  if (!globalQueue) {
    const { debounceMs, maxEdits } = config.writeQueue || {};
    globalQueue = new WriteQueue(unityConnection, { debounceMs, maxEdits });
  }
  return globalQueue;
}

export async function flushWriteQueue() {
  if (globalQueue) {
    try { await globalQueue.flushNow(); } catch { /* ignore */ }
  }
}
