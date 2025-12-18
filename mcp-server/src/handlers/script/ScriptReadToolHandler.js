import fs from 'fs/promises';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { logger } from '../../core/config.js';

export class ScriptReadToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'read_script',
      '[OFFLINE] No Unity connection required. Read a C# file with optional line range and payload limits. Files must be under Assets/ or Packages/ and have .cs extension. PRIORITY: Read minimally — locate the target with get_script_symbols and read only the signature area (~30–40 lines). For large files, always pass startLine/endLine and (optionally) maxBytes.',
      {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Project-relative C# path under Assets/ or Packages/ (e.g., Packages/unity-mcp-server/Editor/Example.cs). Do NOT prefix repository folders (e.g., UnityMCPServer/…).'
          },
          startLine: {
            type: 'number',
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
    const { path, startLine = 1, endLine, maxBytes } = params;

    try {
      // Resolve project paths (Unity未接続でも推定可)
      const info = await this.projectInfo.get();

      // Normalize and validate
      // Normalize common mistakes like UnityMCPServer/Packages/… → Packages/…
      const raw = (path || '').replace(/\\/g, '/');
      const ai = raw.indexOf('Assets/');
      const pi = raw.indexOf('Packages/');
      const idx = ai >= 0 && pi >= 0 ? Math.min(ai, pi) : ai >= 0 ? ai : pi;
      const norm = idx >= 0 ? raw.substring(idx) : raw;
      if (!norm.startsWith('Assets/') && !norm.startsWith('Packages/')) {
        return { error: 'Path must be under Assets/ or Packages/' };
      }
      if (!norm.toLowerCase().endsWith('.cs')) {
        return { error: 'Only .cs files are supported' };
      }

      const abs = info.projectRoot + '/' + norm;
      const stat = await fs.stat(abs).catch(() => null);
      if (!stat || !stat.isFile()) {
        return {
          error: 'File not found',
          path: norm,
          resolvedPath: abs,
          hint: `Verify the file exists at: ${abs}. Path must be relative to Unity project root (e.g., "Assets/Scripts/Foo.cs" or "Packages/com.example/Runtime/Bar.cs").`
        };
      }

      const data = await fs.readFile(abs, 'utf8');
      const lines = data.split('\n');
      const s = Math.max(1, startLine);
      const e = Math.min(lines.length, endLine || s + 199);
      let content = lines.slice(s - 1, e).join('\n');

      if (typeof maxBytes === 'number' && maxBytes > 0) {
        const buf = Buffer.from(content, 'utf8');
        if (buf.length > maxBytes) content = buf.subarray(0, maxBytes).toString('utf8');
      }

      return { success: true, path: norm, startLine: s, endLine: e, content };
    } catch (e) {
      logger.error(`[read_script] failed: ${e.message}`);
      return { error: e.message };
    }
  }
}
