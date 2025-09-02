import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from './RoslynCliUtils.js';

export class RoslynFindSymbolToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'roslyn_find_symbol',
      'Find symbols using external Roslyn CLI (no Unity communication).',
      {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name (substring match)' },
          kind: { type: 'string', description: 'class|struct|interface|enum|method|property|field' },
          relative: { type: 'string', description: 'Optional relative file to restrict' },
        },
        required: ['name']
      }
    );
    this.utils = new RoslynCliUtils(unityConnection);
  }

  async execute(params) {
    const { name, kind, relative } = params;
    const baseArgs = ['find-symbol'];
    baseArgs.push(...(await this.utils.getSolutionOrProjectArgs()));
    baseArgs.push('--name', String(name));
    if (kind) baseArgs.push('--kind', String(kind));
    if (relative) baseArgs.push('--relative', String(relative).replace(/\\\\/g, '/'));
    const res = await this.utils.runCli(baseArgs);
    return res;
  }
}

