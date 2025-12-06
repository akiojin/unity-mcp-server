import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { WORKSPACE_ROOT, logger } from '../core/config.js';

// Simple in-memory state for the latest test run.
// Persisting is unnecessary for the current use case because the Node process
// stays alive across Unity domain reloads, which is where we lose connection.
const state = {
  status: 'idle', // idle | running | completed | error
  runId: null,
  testMode: null,
  startedAt: null,
  completedAt: null,
  lastUpdate: null
};

const workspaceUnityRoot = path.join(WORKSPACE_ROOT || process.cwd(), '.unity');
const runStatePath = path.join(workspaceUnityRoot, 'tests', 'test-run-state.json');

// Load persisted state once at module load
await (async () => {
  try {
    const data = await fs.readFile(runStatePath, 'utf8');
    const parsed = JSON.parse(data);
    Object.assign(state, parsed);
    logger.info(`[testRunState] Loaded persisted state from ${runStatePath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warning(`[testRunState] Failed to load state from ${runStatePath}: ${error.message}`);
    }
  }
})();

export function startRun(testMode, runId) {
  const now = new Date().toISOString();
  state.status = 'running';
  state.runId = runId || crypto.randomUUID();
  state.testMode = testMode || state.testMode;
  state.startedAt = now;
  state.completedAt = null;
  state.lastUpdate = now;
  persist();
  return { ...state };
}

export function updateFromStatus(response) {
  const now = new Date().toISOString();
  if (response?.status) {
    state.status = response.status;
  }
  if (response?.testMode) {
    state.testMode = response.testMode;
  }
  if (response?.runId) {
    state.runId = response.runId;
  }
  state.lastUpdate = now;

  if (response?.status === 'completed') {
    state.completedAt = now;
  }
  if (response?.status === 'idle') {
    state.runId = null;
    state.testMode = null;
    state.startedAt = null;
    state.completedAt = null;
  }
  persist();
  return { ...state };
}

export function markIdle() {
  const res = updateFromStatus({ status: 'idle' });
  return res;
}

export function getState() {
  return { ...state };
}

async function persist() {
  try {
    const dir = path.dirname(runStatePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(runStatePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
  } catch (error) {
    logger.warning(`[testRunState] Failed to persist state to ${runStatePath}: ${error.message}`);
  }
}
