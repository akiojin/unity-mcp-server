import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';

// script_*系に名称統一: シンボル削除（型/メンバー）
export class ScriptRemoveSymbolToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'script_remove_symbol',
      'Remove a C# symbol (type/member) with reference preflight. No Unity comms (Roslyn-based). Responses are summarized for LLMs: errors up to 30 items, message up to 200 chars, and preview/diff/text/content trimmed to 1000 chars.',
      {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project-relative C# file path' },
          namePath: { type: 'string', description: 'Symbol path like Outer/Nested/Member' },
          apply: { type: 'boolean', default: false },
          failOnReferences: { type: 'boolean', default: true },
          removeEmptyFile: { type: 'boolean', default: false }
        },
        required: ['path','namePath']
      }
    );
    this.utils = new RoslynCliUtils(unityConnection);
  }

  async execute(params) {
    const { path, namePath, apply = false, failOnReferences = true, removeEmptyFile = false } = params;
    const args = ['remove-symbol'];
    args.push(...(await this.utils.getSolutionOrProjectArgs()));
    args.push('--relative', String(path).replace(/\\\\/g, '/'));
    args.push('--name-path', String(namePath));
    if (apply) args.push('--apply', 'true');
    if (!failOnReferences) args.push('--fail-on-references', 'false');
    if (removeEmptyFile) args.push('--remove-empty-file', 'true');
    const res = await this.utils.runCli(args);
    return this._summarizeResult(res);
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
        } else { o.message = String(e).slice(0, MAX_MSG_LEN); }
        return o;
      });
      out.errorCount = res.errors.length;
      out.errors = trimmed;
    }
    for (const k of ['preview','diff','text','content']) {
      if (typeof res[k] === 'string' && res[k].length > 0) {
        out[k] = res[k].slice(0, MAX_TEXT_LEN);
        if (res[k].length > MAX_TEXT_LEN) out[`${k}Truncated`] = true;
      }
    }
    for (const k of ['operation','path','relative','symbolName']) {
      if (res[k] !== undefined) out[k] = res[k];
    }
    return Object.keys(out).length ? out : res;
  }
}
