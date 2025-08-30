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
            'List symbols (classes, methods, fields, properties) defined in a C# file with spans. BEST PRACTICES: Use to understand file structure before editing. Returns all symbols with line/column positions. Shows nested symbols with container relationships. Handles large files efficiently. Great for generating file outlines or navigation. Works with Japanese method/variable names.',
            {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Relative Unity project path to a .cs file (e.g., Assets/Scripts/Foo.cs).'
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
        const { path: relPath } = params;

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
