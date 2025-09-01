import fs from 'fs/promises';
import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { loadFileSymbolsWithFallback } from '../../utils/codeIndex.js';
import { logger } from '../../core/config.js';

export class ScriptSymbolsGetToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_symbols_get',
            'FIRST STEP: Identify symbols (classes, methods, fields, properties) with spans before any edit. Use this to scope changes to a single symbol and avoid line‑based edits. Returns line/column positions and containers; works with large files and Japanese identifiers.',
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
            const abs = info.projectRoot + '/' + relPath;
            const st = await fs.stat(abs).catch(() => null);
            if (!st || !st.isFile()) return { error: 'File not found', path: relPath };
            const fsym = await loadFileSymbolsWithFallback(info.projectRoot, info.codeIndexRoot, relPath);
            return { success: true, path: relPath, symbols: fsym.symbols || [] };
        } catch (e) {
            logger.warn(`[script_symbols_get] local failed, falling back to Unity: ${e.message}`);
            if (!this.unityConnection.isConnected()) {
                await this.unityConnection.connect();
            }
            return this.unityConnection.sendCommand('script_symbols_get', { path: relPath });
        }
    }
}
