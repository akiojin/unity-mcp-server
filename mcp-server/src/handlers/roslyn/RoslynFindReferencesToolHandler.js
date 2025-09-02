import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from './RoslynCliUtils.js';

export class RoslynFindReferencesToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'roslyn_find_references',
      'Find identifier references using external Roslyn CLI (no Unity communication).',
      {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Identifier name (exact)' },
          relative: { type: 'string', description: 'Optional relative file to restrict' },
        },
        required: ['name']
      }
    );
    this.utils = new RoslynCliUtils(unityConnection);
  }

  async execute(params) {
    const { name, relative } = params;
    const args = ['find-references'];
    args.push(...(await this.utils.getSolutionOrProjectArgs()));
    args.push('--name', String(name));
    if (relative) args.push('--relative', String(relative).replace(/\\\\/g, '/'));
    return await this.utils.runCli(args);
  }
}

