import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from './RoslynCliUtils.js';

export class RoslynCreateTypeFileToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'roslyn_create_type_file',
      'Create a new C# file with a public class (no Unity communication).',
      {
        type: 'object',
        properties: {
          relative: { type: 'string', description: 'Project-relative file path (should end with .cs)' },
          name: { type: 'string', description: 'Class name' },
          namespace: { type: 'string', description: 'Optional namespace' },
          base: { type: 'string', description: 'Optional base type (e.g., MonoBehaviour)' },
          usings: { type: 'string', description: 'Comma-separated using directives (e.g., System,Newtonsoft.Json)' },
          partial: { type: 'boolean', default: false },
          apply: { type: 'boolean', default: false }
        },
        required: ['relative','name']
      }
    );
    this.utils = new RoslynCliUtils(unityConnection);
  }

  async execute(params) {
    const { relative, name, namespace: ns, base: baseType, usings, partial = false, apply = false } = params;
    const args = ['create-type-file'];
    args.push(...(await this.utils.getSolutionOrProjectArgs()));
    args.push('--relative', String(relative).replace(/\\\\/g, '/'));
    args.push('--name', String(name));
    if (ns) args.push('--namespace', String(ns));
    if (baseType) args.push('--base', String(baseType));
    if (usings) args.push('--usings', String(usings));
    if (partial) args.push('--partial', 'true');
    if (apply) args.push('--apply', 'true');
    return await this.utils.runCli(args);
  }
}

