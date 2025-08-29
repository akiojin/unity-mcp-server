import { WriteQueue } from './writeQueue.js';

let globalQueue = null;

export function getWriteQueue(unityConnection) {
  if (!globalQueue) {
    globalQueue = new WriteQueue(unityConnection);
  }
  return globalQueue;
}

export async function flushWriteQueue() {
  if (globalQueue) {
    try { await globalQueue.flushNow(); } catch { /* ignore */ }
  }
}

