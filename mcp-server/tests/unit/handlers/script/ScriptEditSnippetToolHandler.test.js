import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { ScriptEditSnippetToolHandler } from '../../../../src/handlers/script/ScriptEditSnippetToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

const normalize = (p) => p.replace(/\\/g, '/');

describe('ScriptEditSnippetToolHandler (RED phase)', () => {
  let handler;
  let mockConnection;
  let tmpRoot;
  let projectRoot;
  let assetsPath;
  let packagesPath;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'snippet-handler-'));
    projectRoot = path.join(tmpRoot, 'UnityProject');
    assetsPath = path.join(projectRoot, 'Assets');
    packagesPath = path.join(projectRoot, 'Packages');
    await fs.mkdir(path.join(assetsPath, 'Scripts'), { recursive: true });
    await fs.mkdir(packagesPath, { recursive: true });

    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptEditSnippetToolHandler(mockConnection);

    // Force project info to use the temp Unity project
    mock.method(handler.projectInfo, 'get', async () => ({
      projectRoot: normalize(projectRoot),
      assetsPath: normalize(assetsPath),
      packagesPath: normalize(packagesPath),
      codeIndexRoot: normalize(path.join(projectRoot, '.unity', 'cache', 'code-index'))
    }));
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
    mock.restoreAll();
  });

  it('should generate preview with per-instruction status for multiple guarded deletions', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    const original = `public class SnippetTarget
{
    public void DoWork(string first, string second)
    {
        if (first == null) return;
        DoSomething(first);
        if (second == null) return;
        DoSomethingElse(second);
    }
}
`;
    await fs.writeFile(absPath, original, 'utf8');

    const instructions = [
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        if (first == null) return;\n'
        }
      },
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        if (second == null) return;\n'
        }
      }
    ];

    const validateText = mock.fn(async () => []);
    handler.lsp = { validateText };

    const result = await handler.execute({
      path: relPath,
      instructions,
      preview: true
    });

    assert.equal(result.applied, false);
    assert.equal(Array.isArray(result.results), true);
    assert.equal(result.results.length, 2);
    assert.deepEqual(result.results.map(r => r.status), ['applied', 'applied']);
    assert.equal(typeof result.preview, 'string');
    assert.ok(result.preview.includes('DoSomething(first);'));
    assert.equal(validateText.mock.calls.length, 1);
    assert.deepEqual(validateText.mock.calls[0].arguments, [
      'Assets/Scripts/SnippetTarget.cs',
      result.preview
    ]);
  });

  it('should reject instructions exceeding the 80 character diff limit', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    const longGuard = '        if (thisIsAVeryLongVariableNameThatKeepsGoingMoreThanEightyCharacters == null) return;\n';
    await fs.writeFile(absPath, `class C{\n${longGuard}    DoIt();\n}\n`, 'utf8');

    const instructions = [
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: longGuard
        }
      }
    ];

    handler.lsp = { validateText: mock.fn(async () => []) };

    await assert.rejects(
      () => handler.execute({ path: relPath, instructions, preview: true }),
      /80/
    );
  });

  it('should abort and roll back when resulting code has unmatched braces', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    const original = `public class Broken
{
    public void Execute()
    {
        if (flag)
        {
            DoThing();
        }
    }
}
`;
    await fs.writeFile(absPath, original, 'utf8');

    const instructions = [
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        }\n'
        }
      }
    ];

    const validateText = mock.fn(async () => ([
      { severity: 'error', message: 'Expected }' }
    ]));
    handler.lsp = { validateText };

    await assert.rejects(
      () => handler.execute({ path: relPath, instructions, preview: false }),
      /syntax/i
    );

    const after = await fs.readFile(absPath, 'utf8');
    assert.equal(after, original, 'file content should remain unchanged on syntax error');
    assert.equal(validateText.mock.calls.length, 1);
  });
});
