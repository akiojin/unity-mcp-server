import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { ScriptEditSnippetToolHandler } from '../../../../src/handlers/script/ScriptEditSnippetToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

const normalize = p => p.replace(/\\/g, '/');

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
    assert.deepEqual(
      result.results.map(r => r.status),
      ['applied', 'applied']
    );
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
    const longGuard =
      '        if (thisIsAVeryLongVariableNameThatKeepsGoingMoreThanEightyCharacters == null) return;\n';
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

    const validateText = mock.fn(async () => [{ severity: 'error', message: 'Expected }' }]);
    handler.lsp = { validateText };

    await assert.rejects(
      () => handler.execute({ path: relPath, instructions, preview: false }),
      /syntax/i
    );

    const after = await fs.readFile(absPath, 'utf8');
    assert.equal(after, original, 'file content should remain unchanged on syntax error');
    assert.equal(validateText.mock.calls.length, 0);
  });

  it('should reject anchor with multiple matches (non-unique)', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    const original = `public class Example
{
    public void Process()
    {
        if (x == null) return;
        DoA();
        if (x == null) return;
        DoB();
    }
}
`;
    await fs.writeFile(absPath, original, 'utf8');

    const instructions = [
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        if (x == null) return;\n'
        }
      }
    ];

    handler.lsp = { validateText: mock.fn(async () => []) };

    await assert.rejects(
      () => handler.execute({ path: relPath, instructions, preview: true }),
      /anchor_not_unique.*2 locations/i
    );
  });

  it('should support replace operation', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    const original = `public class Example
{
    public void Check()
    {
        if (value > 10)
        {
            DoThing();
        }
    }
}
`;
    await fs.writeFile(absPath, original, 'utf8');

    const instructions = [
      {
        operation: 'replace',
        anchor: {
          type: 'text',
          target: 'if (value > 10)'
        },
        newText: 'if (value > 20)'
      }
    ];

    handler.lsp = { validateText: mock.fn(async () => []) };

    const result = await handler.execute({ path: relPath, instructions, preview: true });

    assert.equal(result.applied, false);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].status, 'applied');
    assert.ok(result.preview.includes('if (value > 20)'));
    assert.ok(!result.preview.includes('if (value > 10)'));
  });

  it('should support insert operation with position=after (default)', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    const original = `public class Example
{
    public void Run()
    {
        Initialize();
        Process();
    }
}
`;
    await fs.writeFile(absPath, original, 'utf8');

    const instructions = [
      {
        operation: 'insert',
        anchor: {
          type: 'text',
          target: '        Initialize();\n'
        },
        newText: '        Log("Starting");\n'
      }
    ];

    handler.lsp = { validateText: mock.fn(async () => []) };

    const result = await handler.execute({ path: relPath, instructions, preview: true });

    assert.equal(result.results[0].status, 'applied');
    assert.ok(
      result.preview.includes('Initialize();\n        Log("Starting");\n        Process()')
    );
  });

  it('should support insert operation with position=before', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    const original = `public class Example
{
    public void Run()
    {
        Initialize();
        Process();
    }
}
`;
    await fs.writeFile(absPath, original, 'utf8');

    const instructions = [
      {
        operation: 'insert',
        anchor: {
          type: 'text',
          target: '        Process();\n',
          position: 'before'
        },
        newText: '        Validate();\n'
      }
    ];

    handler.lsp = { validateText: mock.fn(async () => []) };

    const result = await handler.execute({ path: relPath, instructions, preview: true });

    assert.equal(result.results[0].status, 'applied');
    assert.ok(result.preview.includes('Initialize();\n        Validate();\n        Process()'));
  });

  it('should apply multiple instructions in sequence (batch editing)', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    const original = `public class Multi
{
    public void Execute()
    {
        if (a == null) return;
        ProcessA();
        if (b == null) return;
        ProcessB();
        if (c > 10)
        {
            ProcessC();
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
          target: '        if (a == null) return;\n'
        }
      },
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        if (b == null) return;\n'
        }
      },
      {
        operation: 'replace',
        anchor: {
          type: 'text',
          target: 'if (c > 10)'
        },
        newText: 'if (c > 20)'
      }
    ];

    handler.lsp = { validateText: mock.fn(async () => []) };

    const result = await handler.execute({ path: relPath, instructions, preview: true });

    assert.equal(result.results.length, 3);
    assert.deepEqual(
      result.results.map(r => r.status),
      ['applied', 'applied', 'applied']
    );
    assert.ok(!result.preview.includes('if (a == null)'));
    assert.ok(!result.preview.includes('if (b == null)'));
    assert.ok(result.preview.includes('if (c > 20)'));
  });

  it('should write to file in apply mode', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    const original = `public class FileWrite
{
    public void Test()
    {
        if (debug == null) return;
        Execute();
    }
}
`;
    await fs.writeFile(absPath, original, 'utf8');

    const instructions = [
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        if (debug == null) return;\n'
        }
      }
    ];

    handler.lsp = { validateText: mock.fn(async () => []) };

    const result = await handler.execute({ path: relPath, instructions, preview: false });

    assert.equal(result.applied, true);
    assert.equal(result.results[0].status, 'applied');

    const afterContent = await fs.readFile(absPath, 'utf8');
    assert.ok(!afterContent.includes('if (debug == null)'));
    assert.ok(afterContent.includes('Execute();'));
  });

  it('should handle CRLF line endings in file content', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    // File content with CRLF line endings (Windows style)
    const originalWithCRLF =
      'public class Example\r\n{\r\n    public void Run()\r\n    {\r\n        if (value == null) return;\r\n        Process();\r\n    }\r\n}\r\n';
    await fs.writeFile(absPath, originalWithCRLF, 'utf8');

    // Anchor with LF line ending (Unix style) - this should still match after normalization
    const instructions = [
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        if (value == null) return;\n'
        }
      }
    ];

    handler.lsp = { validateText: mock.fn(async () => []) };

    const result = await handler.execute({ path: relPath, instructions, preview: true });

    assert.equal(result.results[0].status, 'applied');
    assert.ok(!result.preview.includes('if (value == null)'));
    assert.ok(result.preview.includes('Process();'));
  });

  it('should handle LF anchor when file has CRLF (Issue #97)', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    // File with CRLF
    const fileContent =
      'class Foo\r\n{\r\n    void Bar()\r\n    {\r\n        if (x == null) return;\r\n        DoWork();\r\n    }\r\n}\r\n';
    await fs.writeFile(absPath, fileContent, 'utf8');

    // User provides LF anchor (copied from Read tool which normalizes to LF)
    const instructions = [
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        if (x == null) return;\n'
        }
      }
    ];

    handler.lsp = { validateText: mock.fn(async () => []) };

    // This should succeed after normalization
    const result = await handler.execute({ path: relPath, instructions, preview: true });

    assert.equal(result.results[0].status, 'applied');
    assert.ok(!result.preview.includes('if (x == null)'));
  });

  it('should handle CRLF anchor when file has LF', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    // File with LF
    const fileContent =
      'class Foo\n{\n    void Bar()\n    {\n        if (x == null) return;\n        DoWork();\n    }\n}\n';
    await fs.writeFile(absPath, fileContent, 'utf8');

    // User provides CRLF anchor
    const instructions = [
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        if (x == null) return;\r\n'
        }
      }
    ];

    handler.lsp = { validateText: mock.fn(async () => []) };

    // This should succeed after normalization
    const result = await handler.execute({ path: relPath, instructions, preview: true });

    assert.equal(result.results[0].status, 'applied');
    assert.ok(!result.preview.includes('if (x == null)'));
  });

  // ==================== skipValidation option tests (Issue #310) ====================

  it('should skip LSP validation when skipValidation is true', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    const original = `public class Example
{
    public void Run()
    {
        if (value == null) return;
        Process();
    }
}
`;
    await fs.writeFile(absPath, original, 'utf8');

    const instructions = [
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        if (value == null) return;\n'
        }
      }
    ];

    const validateText = mock.fn(async () => []);
    handler.lsp = { validateText };

    const result = await handler.execute({
      path: relPath,
      instructions,
      skipValidation: true,
      preview: true
    });

    assert.equal(result.applied, false);
    assert.equal(result.results[0].status, 'applied');
    // LSP validateText should NOT be called when skipValidation is true
    assert.equal(validateText.mock.calls.length, 0);
    // Response should include validationSkipped flag
    assert.equal(result.validationSkipped, true);
  });

  it('should still run preSyntaxCheck when skipValidation is true (brace balance)', async () => {
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

    // Delete a closing brace to break the syntax
    const instructions = [
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        }\n    }\n}'
        }
      }
    ];

    const validateText = mock.fn(async () => []);
    handler.lsp = { validateText };

    // preSyntaxCheck should catch the brace imbalance even with skipValidation=true
    await assert.rejects(
      () => handler.execute({ path: relPath, instructions, skipValidation: true, preview: true }),
      /syntax|brace|bracket/i
    );

    // LSP validation should not be called
    assert.equal(validateText.mock.calls.length, 0);
  });

  it('should run LSP validation when skipValidation is false (default)', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    const original = `public class Example
{
    public void Run()
    {
        if (value == null) return;
        Process();
    }
}
`;
    await fs.writeFile(absPath, original, 'utf8');

    const instructions = [
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        if (value == null) return;\n'
        }
      }
    ];

    const validateText = mock.fn(async () => []);
    handler.lsp = { validateText };

    const result = await handler.execute({
      path: relPath,
      instructions,
      // skipValidation not specified, should default to false
      preview: true
    });

    assert.equal(result.applied, false);
    // LSP validateText should be called when skipValidation is false (default)
    assert.equal(validateText.mock.calls.length, 1);
    // Response should include validationSkipped flag as false
    assert.equal(result.validationSkipped, false);
  });

  it('should include validationSkipped flag in response when applying changes', async () => {
    const relPath = 'Assets/Scripts/SnippetTarget.cs';
    const absPath = path.join(projectRoot, 'Assets', 'Scripts', 'SnippetTarget.cs');
    const original = `public class Example
{
    public void Run()
    {
        if (value == null) return;
        Process();
    }
}
`;
    await fs.writeFile(absPath, original, 'utf8');

    const instructions = [
      {
        operation: 'delete',
        anchor: {
          type: 'text',
          target: '        if (value == null) return;\n'
        }
      }
    ];

    handler.lsp = { validateText: mock.fn(async () => []) };

    // Apply with skipValidation=true
    const result = await handler.execute({
      path: relPath,
      instructions,
      skipValidation: true,
      preview: false
    });

    assert.equal(result.applied, true);
    assert.equal(result.validationSkipped, true);

    const afterContent = await fs.readFile(absPath, 'utf8');
    assert.ok(!afterContent.includes('if (value == null)'));
  });
});
