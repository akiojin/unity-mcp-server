import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';

// script_*系に名称統一: 新規C#クラスを新規ファイルで生成
export class ScriptCreateClassFileToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'script_create_class_file',
      'Create a new C# class file (project-relative path, Unity非通信・Roslynベースのプリフライト有り)。応答はLLM向けに要約され、errorsは最大30件・messageは200文字、preview等は1000文字にトリムされます。',
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
    this.utils = new RoslynCliUtils(unityConnection);
  }

  async execute(params) {
    const { path, className, namespace: ns, baseType, usings, partial = false, apply = false } = params;
    const args = ['create-type-file'];
    args.push(...(await this.utils.getSolutionOrProjectArgs()));
    args.push('--relative', String(path).replace(/\\\\/g, '/'));
    args.push('--name', String(className));
    if (ns) args.push('--namespace', String(ns));
    if (baseType) args.push('--base', String(baseType));
    if (usings) args.push('--usings', String(usings));
    if (partial) args.push('--partial', 'true');
    if (apply) args.push('--apply', 'true');
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
