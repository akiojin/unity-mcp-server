import fs from 'node:fs/promises';
import path from 'node:path';

import { WORKSPACE_ROOT, logger } from '../core/config.js';

const UNITY_DIRNAME = '.unity';
const TEST_RESULTS_FILENAME = 'TestResults.json';

function resolveWorkspaceRoot() {
  return WORKSPACE_ROOT || process.cwd();
}

export function getResultsFilePath() {
  const workspaceRoot = resolveWorkspaceRoot();
  if (!workspaceRoot) {
    return null;
  }

  return path.join(workspaceRoot, UNITY_DIRNAME, TEST_RESULTS_FILENAME);
}

export async function persistTestResults(result) {
  const filePath = getResultsFilePath();
  if (!filePath) {
    return null;
  }

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    return filePath;
  } catch (error) {
    logger.warn(`[TestResultsCache] Failed to write test results to ${filePath}: ${error.message}`);
    return null;
  }
}

export async function loadCachedTestResults(targetPath) {
  const filePath = targetPath || getResultsFilePath();
  if (!filePath) {
    return null;
  }

  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn(
        `[TestResultsCache] Failed to read test results from ${filePath}: ${error.message}`
      );
    }
    return null;
  }
}

export async function resetTestResultsCache() {
  const filePath = getResultsFilePath();
  if (!filePath) {
    return;
  }

  try {
    await fs.rm(filePath, { force: true });
  } catch (error) {
    logger.warn(
      `[TestResultsCache] Failed to reset test results cache ${filePath}: ${error.message}`
    );
  }
}
