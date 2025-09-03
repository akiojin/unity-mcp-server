import { spawn } from 'child_process';
import { logger } from '../../core/config.js';
import { RoslynCliUtils } from './RoslynCliUtils.js';

let serverProc = null;
let starting = null; // Promise guard to avoid duplicate spawns
let nextId = 1;
const pending = new Map();
// FIFO queue of last payloads emitted by roslyn-cli (serve writes result first, then an id-envelope)
const resultQueue = [];
const roslynUtils = new RoslynCliUtils(null);

async function startServer() {
  // Use built self-contained binary (auto-build once if missing)
  const cli = await roslynUtils.getCliPath();
  const proc = spawn(cli, ['serve'], { stdio: ['pipe', 'pipe', 'pipe'] });
  proc.on('error', (e) => logger.error(`[roslyn-cli serve] error: ${e.message}`));
  proc.stderr.on('data', d => logger.debug(`[roslyn-cli serve] ${d.toString().trim()}`));
  let buffer = '';
  proc.stdout.on('data', chunk => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const json = JSON.parse(line);
        const id = json.id;
        if (id && pending.has(id)) {
          // Pair the latest result payload (if any) with this id envelope
          const payload = resultQueue.length ? resultQueue.shift() : null;
          const resolved = payload ? Object.assign({ id }, payload) : json;
          pending.get(id).resolve(resolved);
          pending.delete(id);
        } else if (!id) {
          // This is a raw payload from the command; enqueue for pairing
          resultQueue.push(json);
        }
      } catch { /* ignore stray output */ }
    }
  });
  proc.on('close', (code) => {
    logger.warn(`[roslyn-cli serve] exited with code ${code}`);
    serverProc = null;
    // Reject all pending requests to unblock callers
    for (const [id, p] of Array.from(pending.entries())) {
      p.reject(new Error('roslyn-cli serve exited'));
      pending.delete(id);
    }
    // Clear queued payloads
    resultQueue.length = 0;
  });
  return proc;
}

async function ensureServer() {
  if (serverProc && !serverProc.killed) return serverProc;
  if (starting) return starting;
  starting = (async () => {
    try {
      serverProc = await startServer();
      return serverProc;
    } catch (e) {
      logger.error(`[roslyn-cli serve] failed to start: ${e.message}`);
      serverProc = null;
      return null;
    } finally {
      starting = null;
    }
  })();
  return starting;
}

export async function sendServe(cmd, args = []) {
  await ensureServer();
  const attempt = async (retry) => {
    const id = String(nextId++);
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      try {
        serverProc.stdin.write(JSON.stringify({ id, cmd, args }) + '\n');
      } catch (e) {
        pending.delete(id);
        if (retry) return reject(e);
        // restart and retry once
        ensureServer().then(() => attempt(true).then(resolve, reject));
        return;
      }
      // Heavy Roslyn ops on large projects may take >60s. Use generous timeout.
      const to = setTimeout(() => {
        if (pending.has(id)) {
          pending.get(id).reject(new Error('roslyn-cli serve timeout'));
          pending.delete(id);
        }
      }, 300000);
      // bridge resolution to clear timeout
      const original = pending.get(id);
      if (original) {
        pending.set(id, {
          resolve: (v) => { clearTimeout(to); original.resolve(v); },
          reject: (err) => { clearTimeout(to); original.reject(err); }
        });
      }
    });
  };
  try {
    return await attempt(false);
  } catch (e) {
    // Hard restart then one final attempt
    try { if (serverProc) serverProc.kill('SIGKILL'); } catch {}
    serverProc = null;
    await ensureServer();
    return await attempt(true);
  }
}
