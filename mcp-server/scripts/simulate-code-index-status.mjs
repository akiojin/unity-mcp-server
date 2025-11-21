#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { CodeIndexBuildToolHandler } from '../src/handlers/script/CodeIndexBuildToolHandler.js';
import { CodeIndexStatusToolHandler } from '../src/handlers/script/CodeIndexStatusToolHandler.js';
import { ProjectInfoProvider } from '../src/core/projectInfo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const options = {
  throttleMs: 50,
  pollMs: 500,
  reset: false,
  delayStartMs: 0
};

for (const arg of argv) {
  if (arg.startsWith('--throttle=')) {
    options.throttleMs = Math.max(0, Number(arg.split('=')[1] || 0));
  } else if (arg.startsWith('--poll=')) {
    options.pollMs = Math.max(100, Number(arg.split('=')[1] || 500));
  } else if (arg.startsWith('--delayStart=')) {
    options.delayStartMs = Math.max(0, Number(arg.split('=')[1] || 0));
  } else if (arg === '--reset' || arg === '--clean') {
    options.reset = true;
  } else if (arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(0);
  }
}

function printHelp() {
  console.log(`Usage: node scripts/simulate-code-index-status.mjs [--throttle=MS] [--poll=MS] [--reset]

Options:
  --throttle=MS  Delay (ms) after each file during build to keep job running (default: 50)
  --poll=MS      Poll interval for code_index_status (default: 500)
  --delayStart=MS  Delay (ms) before processing begins (default: 0)
  --reset        Delete existing code index database before running
`);
}

const mockUnityConnection = {
  isConnected() {
    return false;
  },
  sendCommand() {
    throw new Error('Unity connection not available in simulation');
  }
};

const buildHandler = new CodeIndexBuildToolHandler(mockUnityConnection);
const statusHandler = new CodeIndexStatusToolHandler(mockUnityConnection);
const projectInfo = new ProjectInfoProvider(mockUnityConnection);

(async () => {
  const info = await projectInfo.get();
  const dbDir = path.resolve(info.codeIndexRoot);
  if (options.reset) {
    try {
      for (const file of ['code-index.db', 'code-index.db-shm', 'code-index.db-wal']) {
        const target = path.join(dbDir, file);
        if (fs.existsSync(target)) fs.unlinkSync(target);
      }
      console.log('[simulate] Existing code index removed.');
    } catch (err) {
      console.error('[simulate] Failed to clean code index:', err.message);
    }
  }

  console.log('[simulate] Starting code_index_build with throttleMs =', options.throttleMs);
  const buildResult = await buildHandler.execute({
    throttleMs: options.throttleMs,
    delayStartMs: options.delayStartMs
  });
  console.log('[simulate] Job ID:', buildResult.jobId);

  const interval = setInterval(async () => {
    try {
      const status = await statusHandler.execute({});
      const job = status.index?.buildJob;
      const line = {
        time: new Date().toISOString(),
        ready: status.index?.ready,
        rows: status.index?.rows,
        jobStatus: job?.status ?? null,
        processed: job?.progress?.processed ?? null,
        total: job?.progress?.total ?? null
      };
      console.log('[status]', JSON.stringify(line));

      if (!job || job.status !== 'running') {
        clearInterval(interval);
        console.log('[simulate] Build finished.');
        process.exit(0);
      }
    } catch (err) {
      console.error('[status]', err.message);
    }
  }, options.pollMs);
})();
