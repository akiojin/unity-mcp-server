import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { LspRpcClientSingleton } from '../../lsp/LspRpcClientSingleton.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';

export class ScriptRefactorRenameToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'script_refactor_rename',
      'Refactor: rename a symbol across the project using the bundled C# LSP. Required params: relative (file path starting with Assets/ or Packages/), namePath (container path like Outer/Nested/Member), newName. Guidance: resolve targets first (script_symbols_get/script_symbol_find), prefer fully-qualified namePath to avoid ambiguity, and use preview for diagnostics only (apply proceeds even if diagnostics exist; errors are returned in response). Responses are summarized (errors≤30, message≤200 chars, large text≤1000 chars).',
      {
        type: 'object',
        properties: {
          relative: {
            type: 'string',
            description: 'Project-relative file path (Assets/ or Packages/)'
          },
          namePath: { type: 'string', description: 'Symbol path like Class/Method' },
          newName: { type: 'string', description: 'New name' },
          preview: {
            type: 'boolean',
            description: 'Preview changes before applying (default: true)'
          }
        },
        required: ['relative', 'namePath', 'newName']
      }
    );
    this.projectInfo = new ProjectInfoProvider(unityConnection);
    this.lsp = null;
  }

  validate(params) {
    super.validate(params);
    const { relative, namePath, newName } = params;
    if (!relative || !namePath || !newName)
      throw new Error('relative, namePath, newName are required');
  }

  async execute(params) {
    const { relative, namePath, newName, preview = true } = params;
    const info = await this.projectInfo.get();
    if (!this.lsp) this.lsp = await LspRpcClientSingleton.getInstance(info.projectRoot);
    const resp = await this.lsp.request('mcp/renameByNamePath', {
      relative: String(relative).replace(/\\\\/g, '/'),
      namePath: String(namePath),
      newName: String(newName),
      apply: !preview
    });
    const r = resp?.result ?? resp;
    return this._summarizeResult(r);
  }

  _summarizeResult(res) {
    if (!res || typeof res !== 'object') return res;
    const MAX_ERRORS = 30;
    const MAX_MSG_LEN = 200;
    const MAX_TEXT_LEN = 1000;
    const out = {};
    if ('id' in res) out.id = res.id;
    if ('success' in res) out.success = !!res.success;
    if ('applied' in res) out.applied = !!res.applied;
    if (Array.isArray(res.errors)) {
      const trimmed = res.errors.slice(0, MAX_ERRORS).map(e => {
        const o = {};
        if (e && typeof e === 'object') {
          if ('id' in e) o.id = e.id;
          if ('message' in e) o.message = String(e.message).slice(0, MAX_MSG_LEN);
          if ('file' in e) o.file = String(e.file).slice(0, 260);
          if ('line' in e) o.line = e.line;
          if ('column' in e) o.column = e.column;
        } else {
          o.message = String(e).slice(0, MAX_MSG_LEN);
        }
        return o;
      });
      out.errorCount = trimmed.length;
      out.totalErrors = res.errors.length;
      out.errors = trimmed;
    }
    // workspace情報は返さない（厳格: .sln必須のため）

    for (const k of ['preview', 'diff', 'text', 'content']) {
      if (typeof res[k] === 'string' && res[k].length > 0) {
        out[k] = res[k].slice(0, MAX_TEXT_LEN);
        if (res[k].length > MAX_TEXT_LEN) out[`${k}Truncated`] = true;
      }
    }
    for (const k of ['operation', 'path', 'relative', 'symbolName']) {
      if (res[k] !== undefined) out[k] = res[k];
    }
    return Object.keys(out).length ? out : res;
  }
}
