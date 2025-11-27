#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const integrationRoot = path.join(repoRoot, 'tests', 'integration');

const curatedUnitTests = [
  'tests/unit/core/codeIndex.test.js',
  'tests/unit/core/config.test.js',
  'tests/unit/core/indexWatcher.test.js',
  'tests/unit/core/projectInfo.test.js',
  'tests/unit/core/server.test.js',
  'tests/unit/handlers/script/CodeIndexStatusToolHandler.test.js'
];

function collectIntegrationTests(dir) {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectIntegrationTests(full));
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(full);
    }
  }
  return files;
}

function detectUnityDependency(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return /UnityConnection|connect\(\)\s*=>\s*new UnityConnection/i.test(content);
  } catch {
    return false;
  }
}

const allIntegrationTests = collectIntegrationTests(integrationRoot);
const nonUnityTests = [];
const unityTests = [];

for (const absPath of allIntegrationTests) {
  const relPath = path.relative(repoRoot, absPath);
  if (detectUnityDependency(absPath)) {
    unityTests.push(relPath);
  } else {
    nonUnityTests.push(relPath);
  }
}

if (nonUnityTests.length === 0) {
  console.warn('[tests] No non-Unity integration tests found.');
}

if (unityTests.length > 0) {
  console.log('[tests] Skipping Unity-dependent integration suites in this run:');
  for (const rel of unityTests) {
    console.log(`  - ${rel}`);
  }
  console.log(
    '[tests] These suites are executed via `pnpm run test:unity` when a Unity Editor is available.'
  );
}

const testTargets = [...curatedUnitTests, ...nonUnityTests];

const child = spawn(process.execPath, ['--test', ...testTargets], {
  stdio: 'inherit',
  cwd: repoRoot
});

child.on('exit', code => {
  process.exit(code ?? 1);
});
