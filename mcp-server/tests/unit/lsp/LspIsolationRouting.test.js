import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LspRpcClientSingleton } from '../../../src/lsp/LspRpcClientSingleton.js';
import { ScriptSymbolsGetToolHandler } from '../../../src/handlers/script/ScriptSymbolsGetToolHandler.js';
import { ScriptRefactorRenameToolHandler } from '../../../src/handlers/script/ScriptRefactorRenameToolHandler.js';
import { ScriptEditStructuredToolHandler } from '../../../src/handlers/script/ScriptEditStructuredToolHandler.js';
import { ScriptRemoveSymbolToolHandler } from '../../../src/handlers/script/ScriptRemoveSymbolToolHandler.js';
import { CodeIndexUpdateToolHandler } from '../../../src/handlers/script/CodeIndexUpdateToolHandler.js';

const originalEnvRoot = process.env.UNITY_PROJECT_ROOT;

const makeProject = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'unityproj-'));
  const assets = path.join(root, 'Assets', 'Scripts');
  fs.mkdirSync(assets, { recursive: true });
  const file = path.join(assets, 'Foo.cs');
  fs.writeFileSync(file, 'class Foo { void Bar() {} }', 'utf8');
  process.env.UNITY_PROJECT_ROOT = root;
  return { root, file, rel: 'Assets/Scripts/Foo.cs' };
};

const cleanupProject = async root => {
  if (root) {
    await fsp.rm(root, { recursive: true, force: true });
  }
  if (originalEnvRoot === undefined) {
    delete process.env.UNITY_PROJECT_ROOT;
  } else {
    process.env.UNITY_PROJECT_ROOT = originalEnvRoot;
  }
};

describe('LSP isolation routing', () => {
  afterEach(async () => {
    mock.reset();
    await LspRpcClientSingleton.reset();
  });

  it('routes document symbols to isolated LSP', async () => {
    const { root, rel } = makeProject();
    const calls = [];
    mock.method(LspRpcClientSingleton, 'getIsolatedInstance', async (projectRoot, kind) => {
      calls.push({ projectRoot, kind });
      return { request: async () => ({ result: [] }) };
    });

    try {
      const handler = new ScriptSymbolsGetToolHandler(null);
      const res = await handler.execute({ path: rel });
      assert.equal(res.success, true);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].kind, 'symbols');
      assert.ok(calls[0].projectRoot.endsWith(root));
    } finally {
      await cleanupProject(root);
    }
  });

  it('routes rename to isolated LSP', async () => {
    const { root, rel } = makeProject();
    const calls = [];
    mock.method(LspRpcClientSingleton, 'getIsolatedInstance', async (projectRoot, kind) => {
      calls.push({ projectRoot, kind });
      return { request: async () => ({ result: { success: true, applied: false } }) };
    });

    try {
      const handler = new ScriptRefactorRenameToolHandler(null);
      const res = await handler.execute({
        relative: rel,
        namePath: 'Foo/Bar',
        newName: 'Baz',
        preview: true
      });
      assert.equal(res.success, true);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].kind, 'rename');
      assert.ok(calls[0].projectRoot.endsWith(root));
    } finally {
      await cleanupProject(root);
    }
  });

  it('routes structured edit to isolated LSP', async () => {
    const { root, rel } = makeProject();
    const calls = [];
    mock.method(LspRpcClientSingleton, 'getIsolatedInstance', async (projectRoot, kind) => {
      calls.push({ projectRoot, kind });
      return { request: async () => ({ result: { success: true, applied: false } }) };
    });

    try {
      const handler = new ScriptEditStructuredToolHandler(null);
      const res = await handler.execute({
        path: rel,
        operation: 'replace_body',
        symbolName: 'Foo/Bar',
        newText: '{ }',
        preview: true
      });
      assert.equal(res.success, true);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].kind, 'edit_structured');
      assert.ok(calls[0].projectRoot.endsWith(root));
    } finally {
      await cleanupProject(root);
    }
  });

  it('routes remove_symbol to isolated LSP', async () => {
    const { root, rel } = makeProject();
    const calls = [];
    mock.method(LspRpcClientSingleton, 'getIsolatedInstance', async (projectRoot, kind) => {
      calls.push({ projectRoot, kind });
      return { request: async () => ({ result: { success: true, applied: false } }) };
    });

    try {
      const handler = new ScriptRemoveSymbolToolHandler(null);
      const res = await handler.execute({ path: rel, namePath: 'Foo/Bar', apply: false });
      assert.equal(res.success, true);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].kind, 'remove_symbol');
      assert.ok(calls[0].projectRoot.endsWith(root));
    } finally {
      await cleanupProject(root);
    }
  });

  it('routes update_index to isolated LSP', async () => {
    const { root, rel } = makeProject();
    const calls = [];
    mock.method(LspRpcClientSingleton, 'getIsolatedInstance', async (projectRoot, kind) => {
      calls.push({ projectRoot, kind });
      return { request: async () => ({ result: [] }) };
    });

    try {
      const handler = new CodeIndexUpdateToolHandler(null);
      handler.index = {
        replaceSymbolsForPath: async () => {},
        upsertFile: async () => {}
      };
      const res = await handler.execute({ paths: [rel], retry: 0, concurrency: 1 });
      assert.equal(res.success, true);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].kind, 'update_index');
      assert.ok(calls[0].projectRoot.endsWith(root));
    } finally {
      await cleanupProject(root);
    }
  });
});
