import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { UnityConnection } from '../../../src/core/unityConnection.js';
import { ScriptReadToolHandler } from '../../../src/handlers/script/ScriptReadToolHandler.js';
import { ScriptSearchToolHandler } from '../../../src/handlers/script/ScriptSearchToolHandler.js';
import { ScriptSymbolsGetToolHandler } from '../../../src/handlers/script/ScriptSymbolsGetToolHandler.js';
import { ScriptSymbolFindToolHandler } from '../../../src/handlers/script/ScriptSymbolFindToolHandler.js';
import { LspProcessManager } from '../../../src/lsp/LspProcessManager.js';

function setupTempUnityProject() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'unityproj-'));
  const assets = path.join(root, 'Assets');
  const packages = path.join(root, 'Packages');
  mkdirSync(assets, { recursive: true });
  mkdirSync(packages, { recursive: true });
  const rel = 'Packages/MyPkg/Symbols.cs';
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  const content = `using System;\nnamespace Demo { public class Symbol { public void Foo(){} } public class Other{} }`;
  writeFileSync(abs, content, 'utf8');
  // simple file in Assets too
  const abs2 = path.join(root, 'Assets', 'Test.cs');
  writeFileSync(abs2, 'class A { void X(){} }', 'utf8');
  process.env.UNITY_PROJECT_ROOT = root;
  return { root, relPkg: rel };
}

const originalUnityProjectRoot = process.env.UNITY_PROJECT_ROOT;
test.afterEach(async () => {
  if (originalUnityProjectRoot === undefined) {
    delete process.env.UNITY_PROJECT_ROOT;
  } else {
    process.env.UNITY_PROJECT_ROOT = originalUnityProjectRoot;
  }
  const mgr = new LspProcessManager();
  await mgr.stop(0);
});

test('script_read (local) reads known file range', async () => {
  const env = setupTempUnityProject();
  const u = new UnityConnection();
  const handler = new ScriptReadToolHandler(u);
  const res = await handler.execute({
    path: env.relPkg,
    startLine: 1,
    endLine: 6,
    maxBytes: 4096
  });
  assert.equal(res.success, true);
  assert.match(res.content, /namespace Demo/);
});

test('script_search (local) finds class Symbol in packages', async () => {
  const env = setupTempUnityProject();
  const u = new UnityConnection();
  const handler = new ScriptSearchToolHandler(u);
  const res = await handler.execute({
    pattern: 'class Symbol',
    patternType: 'substring',
    scope: 'packages',
    pageSize: 5,
    maxMatchesPerFile: 2,
    snippetContext: 1
  });
  assert.equal(res.success, true);
  assert.ok(res.total >= 1, 'should find at least one match');
  assert.ok(Array.isArray(res.pathTable));
});

test('script_symbols_get (local) returns symbols for Symbols.cs', async () => {
  const env = setupTempUnityProject();
  const u = new UnityConnection();
  const handler = new ScriptSymbolsGetToolHandler(u);
  const res = await handler.execute({ path: env.relPkg });
  assert.equal(res.success, true);
  const classes = (res.symbols || []).filter(s => s.kind === 'class');
  assert.ok(classes.length >= 1, 'at least one class detected');
});

test('script_symbol_find (local) finds classes in packages', async () => {
  const env = setupTempUnityProject();
  const u = new UnityConnection();
  const handler = new ScriptSymbolFindToolHandler(u);
  const res = await handler.execute({
    name: 'Symbol',
    kind: 'class',
    scope: 'packages',
    exact: false
  });
  assert.equal(res.success, true);
  assert.ok(res.total >= 1, 'at least one symbol found');
});
