import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';

// script_*系に名称統一: 新規C#クラスを新規ファイルで生成
export class ScriptCreateClassFileToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'script_create_class_file',
      'Create a new C# class file (project-relative path, Unity非通信・Roslynベースのプリフライト有り)。',
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
    return await this.utils.runCli(args);
  }
}

