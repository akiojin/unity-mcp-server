import fs from 'fs/promises';
import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { LspRpcClientSingleton } from '../../lsp/LspRpcClientSingleton.js';

export class ScriptSymbolsGetToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'script_symbols_get',
      '[OFFLINE] No Unity connection required. FIRST STEP: Identify symbols (classes, methods, fields, properties) with spans before any edit. Path must start with Assets/ or Packages/. Use this to scope changes to a single symbol and avoid line-based edits. Returns line/column positions and container names (helpful to build container namePath like Outer/Nested/Member).',
      {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Project-relative .cs path under Assets/ or Packages/ (e.g., Packages/unity-mcp-server/Editor/Foo.cs). Do NOT prefix repository folders (e.g., UnityMCPServer/…).'
          }
        },
        required: ['path']
      }
    );
    this.unityConnection = unityConnection;
    this.projectInfo = new ProjectInfoProvider(unityConnection);
  }

  validate(params) {
    super.validate(params);

    const { path } = params;

    if (!path || path.trim() === '') {
      throw new Error('path cannot be empty');
    }

    // Check for .cs extension
    if (!path.endsWith('.cs')) {
      throw new Error('Only .cs files are supported');
    }
  }

  async execute(params) {
    // Normalize to project-relative path (strip repo-root prefixes if provided)
    const rawPath = String(params.path || '').replace(/\\/g, '/');
    const ai = rawPath.indexOf('Assets/');
    const pi = rawPath.indexOf('Packages/');
    const cut = ai >= 0 && pi >= 0 ? Math.min(ai, pi) : ai >= 0 ? ai : pi;
    const relPath = cut >= 0 ? rawPath.substring(cut) : rawPath;

    try {
      const info = await this.projectInfo.get();
      if (!relPath.startsWith('Assets/') && !relPath.startsWith('Packages/')) {
        return { error: 'Path must be under Assets/ or Packages/' };
      }
      const abs = path.join(info.projectRoot, relPath);
      const st = await fs.stat(abs).catch(() => null);
      if (!st || !st.isFile()) {
        return {
          error: 'File not found',
          path: relPath,
          resolvedPath: abs,
          hint: `Verify the file exists at: ${abs}. Path must be relative to Unity project root (e.g., "Assets/Scripts/Foo.cs" or "Packages/com.example/Runtime/Bar.cs").`
        };
      }
      const lsp = await LspRpcClientSingleton.getInstance(info.projectRoot);
      const uri = 'file://' + abs.replace(/\\\\/g, '/');
      const res = await lsp.request('textDocument/documentSymbol', { textDocument: { uri } });
      const docSymbols = res?.result ?? res ?? [];
      const list = [];
      const visit = (s, container) => {
        const start = s.range?.start || s.selectionRange?.start || {};
        list.push({
          name: s.name || '',
          kind: this.mapKind(s.kind),
          container: container || null,
          namespace: null,
          startLine: (start.line ?? 0) + 1,
          startColumn: (start.character ?? 0) + 1,
          endLine: (start.line ?? 0) + 1,
          endColumn: (start.character ?? 0) + 1
        });
        if (Array.isArray(s.children)) for (const c of s.children) visit(c, s.name || container);
      };
      if (Array.isArray(docSymbols)) for (const s of docSymbols) visit(s, null);
      return { success: true, path: relPath, symbols: list };
    } catch (e) {
      return { error: e.message || 'Failed to get symbols' };
    }
  }

  mapKind(k) {
    switch (k) {
      case 5:
        return 'class';
      case 23:
        return 'struct';
      case 11:
        return 'interface';
      case 10:
        return 'enum';
      case 6:
        return 'method';
      case 7:
        return 'property';
      case 8:
        return 'field';
      default:
        return undefined;
    }
  }
}
