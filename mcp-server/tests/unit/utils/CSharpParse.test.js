import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseFileSymbols } from '../../../src/utils/csharpParse.js';

test('parseFileSymbols detects classes and methods roughly', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'unityproj-'));
  const rel = 'Packages/My/Symbols.cs';
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, 'namespace Demo { public class Symbol { public void Foo(){} } }', 'utf8');
  const out = parseFileSymbols(rel, await (await import('node:fs/promises')).readFile(abs, 'utf8'));
  const classes = out.symbols.filter(s => s.kind === 'class').map(s => s.name);
  assert.ok(classes.includes('Symbol'));
});
