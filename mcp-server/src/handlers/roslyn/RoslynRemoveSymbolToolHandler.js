import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from './RoslynCliUtils.js';

export class RoslynRemoveSymbolToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'roslyn_remove_symbol',
      'Remove a type/member symbol using external Roslyn CLI with preflight (no Unity communication).',
      {
        type: 'object',
        properties: {
          relative: { type: 'string', description: 'Project-relative file path' },
          namePath: { type: 'string', description: 'Symbol path like Outer/Nested/Member' },
          apply: { type: 'boolean', default: false },
          failOnReferences: { type: 'boolean', default: true },
          removeEmptyFile: { type: 'boolean', default: false }
        },
        required: ['relative','namePath']
      }
    );
    this.utils = new RoslynCliUtils(unityConnection);
  }

  async execute(params) {
    const { relative, namePath, apply = false, failOnReferences = true, removeEmptyFile = false } = params;
    const args = ['remove-symbol'];
    args.push(...(await this.utils.getSolutionOrProjectArgs()));
    args.push('--relative', String(relative).replace(/\\\\/g, '/'));
    args.push('--name-path', String(namePath));
    if (apply) args.push('--apply', 'true');
    if (!failOnReferences) args.push('--fail-on-references', 'false');
    if (removeEmptyFile) args.push('--remove-empty-file', 'true');
    return await this.utils.runCli(args);
  }
}

