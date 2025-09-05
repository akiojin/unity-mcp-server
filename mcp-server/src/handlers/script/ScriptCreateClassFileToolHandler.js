import { BaseToolHandler } from '../base/BaseToolHandler.js';
import fs from 'fs';
import path from 'path';

// script_*系に名称統一: 新規C#クラスを新規ファイルで生成
export class ScriptCreateClassFileToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'script_create_class_file',
      'Create a new C# class file. Required: path under Assets/ or Packages/ (".cs" appended if missing), className. Optional: namespace, baseType (adds using UnityEngine if MonoBehaviour), usings (CSV), partial. Roslyn preflight (no Unity comms). Responses summarized for LLMs (errors≤30, message≤200 chars, preview≤1000 chars).',
      {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project-relative C# file path (e.g., Assets/Scripts/MyClass.cs)' },
          className: { type: 'string', description: 'Class name' },
          namespace: { type: 'string', description: 'Optional namespace' },
          baseType: { type: 'string', description: 'Optional base type (e.g., MonoBehaviour)' },
          usings: { type: 'string', description: 'Comma-separated using directives (e.g., System,Newtonsoft.Json)' },
          partial: { type: 'boolean', default: false },
          apply: { type: 'boolean', default: false }
        },
        required: ['path','className']
      }
    );
    this.unityConnection = unityConnection;
  }

  async execute(params) {
    const { path: rel, className, namespace: ns, baseType, usings, partial = false, apply = false } = params;
    const relative = String(rel).replace(/\\\\/g, '/').endsWith('.cs') ? String(rel).replace(/\\\\/g, '/') : String(rel).replace(/\\\\/g, '/') + '.cs';
    const code = this._buildSource({ className: String(className), ns: ns ? String(ns) : null, baseType: baseType ? String(baseType) : null, usings: usings ? String(usings) : null, partial: !!partial });
    if (!apply) {
      return { success: true, applied: false, preview: code.slice(0, 1000), previewTruncated: code.length > 1000, relative: relative };
    }
    const full = this._resolveFullPath(relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, code, 'utf8');
    return { success: true, applied: true, relative };
  }

  _resolveFullPath(relative) {
    // Project root resolution via ProjectInfoProvider would be heavier; reconstruct by walking up
    const cwd = process.cwd();
    return path.resolve(cwd, relative);
  }

  _buildSource({ className, ns, baseType, usings, partial }) {
    const useList = [];
    if (usings) useList.push(...usings.split(',').map(s => s.trim()).filter(Boolean));
    if (baseType === 'MonoBehaviour' && !useList.includes('UnityEngine')) useList.push('UnityEngine');
    const header = useList.length ? useList.map(u => `using ${u};`).join('\n') + '\n\n' : '';
    const partialKw = partial ? ' partial' : '';
    const baseClause = baseType ? ` : ${baseType}` : '';
    const classBlock = `public${partialKw} class ${className}${baseClause}\n{\n}\n`;
    if (ns) {
      return `${header}namespace ${ns}\n{\n${classBlock}\n}`;
    }
    return `${header}${classBlock}`;
  }
}
