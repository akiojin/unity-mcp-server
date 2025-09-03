import { spawn } from 'child_process';
import { RoslynCliUtils } from './RoslynCliUtils.js';
import { logger } from '../../core/config.js';

let serverProc = null;
let nextId = 1;
const pending = new Map();

async function ensureServer() {
  if (serverProc && !serverProc.killed) return serverProc;
  const utils = new RoslynCliUtils(null);
  const bin = await utils.getCliPath();
  serverProc = spawn(bin, ['serve'], { stdio: ['pipe', 'pipe', 'pipe'] });
  serverProc.on('error', (e) => logger.error(`[roslyn-cli serve] error: ${e.message}`));
  serverProc.stderr.on('data', d => logger.debug(`[roslyn-cli serve] ${d.toString().trim()}`));
  let buffer = '';
  serverProc.stdout.on('data', chunk => {
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
          pending.get(id).resolve(json);
          pending.delete(id);
        }
      } catch { /* ignore stray output */ }
    }
  });
  return serverProc;
}

export async function sendServe(cmd, args = []) {
  await ensureServer();
  const id = String(nextId++);
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      serverProc.stdin.write(JSON.stringify({ id, cmd, args }) + '\n');
    } catch (e) {
      pending.delete(id);
      reject(e);
    }
    // Optional timeout
    setTimeout(() => {
      if (pending.has(id)) {
        pending.get(id).reject(new Error('roslyn-cli serve timeout'));
        pending.delete(id);
      }
    }, 60000);
  });
}

