import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { LspRpcClientSingleton } from '../../lsp/LspRpcClientSingleton.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';

// script_*系に名称統一: シンボル削除（型/メンバー）
export class ScriptRemoveSymbolToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'script_remove_symbol',
      'Remove a C# symbol (type/member) with reference preflight. Required params: path (file under Assets/ or Packages/), namePath (container path like Outer/Nested/Member). No Unity comms (Roslyn-based). Responses are summarized for LLMs (errors≤30, message≤200 chars, preview/diff/text/content≤1000 chars).',
      {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project-relative C# file path' },
          namePath: { type: 'string', description: 'Symbol path like Outer/Nested/Member' },
          apply: { type: 'boolean', description: 'Apply changes immediately (default: false)' },
          failOnReferences: {
            type: 'boolean',
            description: 'Fail if symbol has references (default: true)'
          },
          removeEmptyFile: {
            type: 'boolean',
            description: 'Remove file if it becomes empty (default: false)'
          }
        },
        required: ['path', 'namePath']
      }
    );
    this.projectInfo = new ProjectInfoProvider(unityConnection);
    this.lsp = null;
  }

  async execute(params) {
    const {
      path,
      namePath,
      apply = false,
      failOnReferences = true,
      removeEmptyFile = false
    } = params;
    const info = await this.projectInfo.get();
    if (!this.lsp) this.lsp = await LspRpcClientSingleton.getInstance(info.projectRoot);
    const resp = await this.lsp.request('mcp/removeSymbol', {
      relative: String(path).replace(/\\\\/g, '/'),
      namePath: String(namePath),
      apply: !!apply,
      failOnReferences: !!failOnReferences,
      removeEmptyFile: !!removeEmptyFile
    });
    return this._summarizeResult(resp?.result ?? resp);
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
