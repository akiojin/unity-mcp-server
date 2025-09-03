import { spawn } from 'child_process';
import { logger } from '../../core/config.js';

let serverProc = null;
let starting = null; // Promise guard to avoid duplicate spawns
let nextId = 1;
const pending = new Map();
let csprojPath = null;

function getCsprojPath() {
  if (!csprojPath) {
    csprojPath = new URL('../../../../roslyn-cli/roslyn-cli.csproj', import.meta.url).pathname;
  }
  return csprojPath;
}

function startServer() {
  const csproj = getCsprojPath();
  const proc = spawn('dotnet', ['run', '--project', csproj, '--', 'serve'], { stdio: ['pipe', 'pipe', 'pipe'] });
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
          pending.get(id).resolve(json);
          pending.delete(id);
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
  });
  return proc;
}

async function ensureServer() {
  if (serverProc && !serverProc.killed) return serverProc;
  if (starting) return starting;
  starting = new Promise((resolve) => {
    try {
      serverProc = startServer();
      resolve(serverProc);
    } catch (e) {
      logger.error(`[roslyn-cli serve] failed to start: ${e.message}`);
      serverProc = null;
      resolve(null);
    }
  }).finally(() => { starting = null; });
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
      const to = setTimeout(() => {
        if (pending.has(id)) {
          pending.get(id).reject(new Error('roslyn-cli serve timeout'));
          pending.delete(id);
        }
      }, 60000);
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
