#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';

const unitGlobs = ['tests/unit/**/*.test.js'];
const integrationTests = [
  path.join('tests', 'integration', 'code-index-background.test.js'),
];

const child = spawn(process.execPath, ['--test', ...unitGlobs, ...integrationTests], {
  stdio: 'inherit',
});

child.on('exit', code => {
  process.exit(code ?? 1);
});
