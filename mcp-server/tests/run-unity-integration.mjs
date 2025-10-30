import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);
const integrationDir = path.resolve('tests/integration');

function requiresUnity(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (/new\s+UnityConnection\s*\(/.test(content)) return true;
  if (/Unity Editorが起動している/.test(content) || /Unity connection/.test(content)) return true;
  return false;
}

const unityTests = [];
function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (entry.name.endsWith('.test.js') && requiresUnity(full)) unityTests.push(full);
  }
}
collect(integrationDir);

console.log('Unity-dependent tests:', unityTests);
try {
  const { stdout, stderr } = await execFileAsync(process.execPath, ['--test', ...unityTests]);
  process.stdout.write(stdout);
  process.stderr.write(stderr);
} catch (error) {
  if (error.stdout) process.stdout.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  process.exitCode = error.code ?? 1;
}
