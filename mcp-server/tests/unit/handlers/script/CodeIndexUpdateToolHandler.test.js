import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CodeIndexUpdateToolHandler } from '../../../../src/handlers/script/CodeIndexUpdateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

class MockProjectInfo {
  constructor(root) {
    this.root = root;
  }

  async get() {
    return { projectRoot: this.root };
  }
}

class MockCodeIndex {
  constructor() {
    this.replaceCalls = [];
    this.upsertCalls = [];
  }

  async replaceSymbolsForPath(path, rows) {
    this.replaceCalls.push({ path, rows });
  }

  async upsertFile(path, sig) {
    this.upsertCalls.push({ path, sig });
  }
}

describe('CodeIndexUpdateToolHandler', () => {
  let tmpDir;
  let handler;
  let projectRoot;
  let codeIndex;
  let lsp;

  const writeFile = (relative, contents = '// test file') => {
    const abs = path.join(projectRoot, relative);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contents);
    return abs;
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-index-update-'));
    projectRoot = path.join(tmpDir, 'UnityProject');
    fs.mkdirSync(projectRoot, { recursive: true });

    const unityConnection = createMockUnityConnection();
    handler = new CodeIndexUpdateToolHandler(unityConnection);

    codeIndex = new MockCodeIndex();
    handler.index = codeIndex;

    handler.projectInfo = new MockProjectInfo(projectRoot);

    lsp = {
      request: async () => ([
        {
          name: 'Foo',
          kind: 5,
          range: { start: { line: 0, character: 0 } },
          children: [
            {
              name: 'Bar',
              kind: 6,
              range: { start: { line: 2, character: 4 } }
            }
          ]
        }
      ])
    };
    handler.lsp = lsp;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns error when no paths provided', async () => {
    const res = await handler.execute({});
    assert.equal(res.success, false);
    assert.equal(res.error, 'invalid_arguments');
  });

  it('returns error when files are missing', async () => {
    const res = await handler.execute({ paths: ['Assets/Missing.cs'] });
    assert.equal(res.success, false);
    assert.equal(res.error, 'files_not_found');
    assert.deepEqual(res.missing, ['Assets/Missing.cs']);
  });

  it('updates index for existing file', async () => {
    writeFile('Assets/Scripts/Foo.cs', 'class Foo { void Bar() {} }');

    const res = await handler.execute({ paths: ['Assets/Scripts/Foo.cs'] });

    assert.equal(res.success, true);
    assert.equal(res.updated, 1);
    assert.equal(codeIndex.replaceCalls.length, 1);
    const [call] = codeIndex.replaceCalls;
    assert.equal(call.path, 'Assets/Scripts/Foo.cs');
    assert.equal(call.rows.length, 2);
    assert.equal(codeIndex.upsertCalls.length, 1);
  });

  it('reports failure from LSP errors', async () => {
    writeFile('Assets/Scripts/Foo.cs');
    handler.lsp = {
      request: async () => {
        throw new Error('boom');
      }
    };

    const res = await handler.execute({ paths: ['Assets/Scripts/Foo.cs'] });

    assert.equal(res.success, false);
    assert.equal(res.updated, 0);
    assert.equal(res.failures.length, 1);
    assert.equal(res.failures[0].path, 'Assets/Scripts/Foo.cs');
    assert.ok(res.failures[0].reason.includes('boom'));
  });
});
