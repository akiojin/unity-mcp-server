import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { UnityConnection } from '../../../src/core/unityConnection.js';
import { config } from '../../../src/core/config.js';
import { CodeIndex } from '../../../src/core/codeIndex.js';
import { ScriptReadToolHandler } from '../../../src/handlers/script/ScriptReadToolHandler.js';
import { ScriptSearchToolHandler } from '../../../src/handlers/script/ScriptSearchToolHandler.js';
import { ScriptSymbolsGetToolHandler } from '../../../src/handlers/script/ScriptSymbolsGetToolHandler.js';
import { ScriptSymbolFindToolHandler } from '../../../src/handlers/script/ScriptSymbolFindToolHandler.js';
import { LspRpcClientSingleton } from '../../../src/lsp/LspRpcClientSingleton.js';
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
  const content =
    'using System;\n' +
    'namespace Demo {\n' +
    '  public class Symbol { public void Foo(){} }\n' +
    '  public class Other {}\n' +
    '}\n';
  writeFileSync(abs, content, 'utf8');
  // simple file in Assets too
  const abs2 = path.join(root, 'Assets', 'Test.cs');
  writeFileSync(abs2, 'class A { void X(){} }', 'utf8');
  config.project = {
    ...(config.project || {}),
    root,
    codeIndexRoot: path.join(root, '.unity', 'cache', 'code-index')
  };
  // ProjectInfoProvider prioritizes UNITY_PROJECT_ROOT, so align it with the temp project.
  process.env.UNITY_PROJECT_ROOT = root;
  return { root, relPkg: rel };
}

const originalProject = config.project ? { ...config.project } : null;
const originalEnvRoot = process.env.UNITY_PROJECT_ROOT;
test.afterEach(async () => {
  if (originalProject === null) {
    delete config.project;
  } else {
    config.project = { ...originalProject };
  }
  if (originalEnvRoot === undefined) {
    delete process.env.UNITY_PROJECT_ROOT;
  } else {
    process.env.UNITY_PROJECT_ROOT = originalEnvRoot;
  }
  await LspRpcClientSingleton.reset();
  const mgr = new LspProcessManager();
  await mgr.stop(0);
});

test('read (local) reads known file range', async () => {
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

test('search (local) finds class Symbol in packages', async () => {
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
  assert.ok(Array.isArray(res.results), 'results should be an array');
  assert.ok(res.results[0]?.path, 'each result should have a path property');
});

test('get_symbols (local) returns symbols for Symbols.cs', async () => {
  const env = setupTempUnityProject();
  const u = new UnityConnection();
  const handler = new ScriptSymbolsGetToolHandler(u);
  const res = await handler.execute({ path: env.relPkg });
  assert.equal(res.success, true);
  const classes = (res.symbols || []).filter(s => s.kind === 'class');
  assert.ok(classes.length >= 1, 'at least one class detected');
});

test('find_symbol (local) finds classes in packages', async () => {
  const env = setupTempUnityProject();
  const u = new UnityConnection();

  // find_symbol requires an initialized code index (SQLite DB).
  const index = new CodeIndex(u);
  await index.clearAndLoad([
    {
      path: env.relPkg,
      name: 'Symbol',
      kind: 'class',
      container: null,
      ns: 'Demo',
      line: 1,
      column: 1
    }
  ]);

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
