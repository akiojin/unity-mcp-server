import fs from 'fs/promises';
import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';

export class ScriptSymbolsGetToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_symbols_get',
            'FIRST STEP: Identify symbols (classes, methods, fields, properties) with spans before any edit. Path must start with Assets/ or Packages/. Use this to scope changes to a single symbol and avoid line-based edits. Returns line/column positions and container names (helpful to build container namePath like Outer/Nested/Member).',
            {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Project-relative .cs path under Assets/ or Packages/ (e.g., Packages/unity-editor-mcp/Editor/Foo.cs). Do NOT prefix repository folders (e.g., UnityEditorMCP/…).'
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
        const cut = (ai >= 0 && pi >= 0) ? Math.min(ai, pi) : (ai >= 0 ? ai : pi);
        const relPath = cut >= 0 ? rawPath.substring(cut) : rawPath;

        try {
            const info = await this.projectInfo.get();
            if (!relPath.startsWith('Assets/') && !relPath.startsWith('Packages/')) {
                return { error: 'Path must be under Assets/ or Packages/' };
            }
            const abs = path.join(info.projectRoot, relPath);
            const st = await fs.stat(abs).catch(() => null);
            if (!st || !st.isFile()) return { error: 'File not found', path: relPath };
            // Roslyn CLIで当該ファイル内のシンボルを列挙（nameに空文字を渡し全一致）
            const { RoslynCliUtils } = await import('../roslyn/RoslynCliUtils.js');
            const roslyn = new RoslynCliUtils(this.unityConnection);
            const args = ['find-symbol'];
            args.push(...(await roslyn.getSolutionOrProjectArgs()));
            args.push('--relative', relPath, '--name', '');
            const res = await roslyn.runCli(args);
            const list = (res.results || []).map(r => ({
                name: r.name,
                kind: r.kind,
                container: r.container,
                namespace: r.ns,
                startLine: r.line,
                startColumn: r.column,
                endLine: r.line,
                endColumn: r.column
            }));
            return { success: true, path: relPath, symbols: list };
        } catch (e) {
            return { error: e.message || 'Failed to get symbols' };
        }
    }
}
