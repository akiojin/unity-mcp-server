import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';

// script_*系に名称統一: シンボル削除（型/メンバー）
export class ScriptRemoveSymbolToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'script_remove_symbol',
      'Remove a C# symbol (type/member) with reference preflight. Unity非通信・Roslynベース。',
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
    return await this.utils.runCli(args);
  }
}

