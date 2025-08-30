import fs from 'fs/promises';
import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { logger } from '../../core/config.js';

export class ScriptReadToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_read',
            'Read a C# file with optional line range and payload limits (LLM‑friendly). BEST PRACTICES: For large files (>1000 lines), use startLine/endLine to read specific sections. Use maxBytes to control response size. Default reads 200 lines at a time to avoid token limits. Files must be under Assets/ or Packages/ and have .cs extension.',
            {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Relative Unity project path (e.g., Assets/Scripts/Example.cs). Must be inside project.'
                    },
                    startLine: {
                        type: 'number',
                        default: 1,
                        description: 'Starting line (1-based, inclusive). Defaults to 1.'
                    },
                    endLine: {
                        type: 'number',
                        description: 'Ending line (inclusive). Defaults to startLine + 199 when omitted.'
                    },
                    maxBytes: {
                        type: 'number',
                        description: 'Maximum bytes to return to cap payload size for LLMs.'
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

        const { path, startLine, endLine } = params;

        // Validate path
        if (!path || path.trim() === '') {
            throw new Error('path cannot be empty');
        }

        // Validate line numbers if provided
        if (startLine !== undefined && startLine < 1) {
            throw new Error('startLine must be at least 1');
        }

        if (endLine !== undefined && startLine !== undefined && endLine < startLine) {
            throw new Error('endLine cannot be less than startLine');
        }
    }

    async execute(params) {
        const {
            path,
            startLine = 1,
            endLine,
            maxBytes
        } = params;

        try {
            // Resolve project paths (Unity未接続でも推定可)
            const info = await this.projectInfo.get();

            // Normalize and validate
            const norm = (path || '').replace(/\\/g, '/');
            if (!norm.startsWith('Assets/') && !norm.startsWith('Packages/')) {
                return { error: 'Path must be under Assets/ or Packages/' };
            }
            if (!norm.toLowerCase().endsWith('.cs')) {
                return { error: 'Only .cs files are supported' };
            }

            const abs = info.projectRoot + '/' + norm;
            const stat = await fs.stat(abs).catch(() => null);
            if (!stat || !stat.isFile()) return { error: 'File not found', path: norm };

            const data = await fs.readFile(abs, 'utf8');
            const lines = data.split('\n');
            const s = Math.max(1, startLine);
            const e = Math.min(lines.length, endLine || (s + 199));
            let content = lines.slice(s - 1, e).join('\n');

            if (typeof maxBytes === 'number' && maxBytes > 0) {
                const buf = Buffer.from(content, 'utf8');
                if (buf.length > maxBytes) content = buf.subarray(0, maxBytes).toString('utf8');
            }

            return { success: true, path: norm, startLine: s, endLine: e, content };
        } catch (e) {
            logger.error(`[script_read] failed: ${e.message}`);
            return { error: e.message };
        }
    }
}
