import fs from 'fs';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from './RoslynCliUtils.js';

export class RoslynReplaceSymbolBodyToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'roslyn_replace_symbol_body',
      'Replace a method body using external Roslyn CLI with preflight (no Unity communication).',
      {
        type: 'object',
        properties: {
          relative: { type: 'string', description: 'Project-relative file path (Assets/... or Packages/...)' },
          namePath: { type: 'string', description: 'Symbol path like Class/Method' },
          body: { type: 'string', description: 'New method body, with or without surrounding braces' },
          apply: { type: 'boolean', default: false, description: 'When true, apply changes if preflight passes' },
        },
        required: ['relative', 'namePath', 'body']
      }
    );
    this.utils = new RoslynCliUtils(unityConnection);
  }

  async execute(params) {
    const { relative, namePath, body, apply = false } = params;
    // Write body to a temp file for CLI input
    const tmp = await fs.promises.mkdtemp(require('os').tmpdir() + '/roslyn-body-');
    const bodyFile = `${tmp}/body.txt`;
    await fs.promises.writeFile(bodyFile, String(body), 'utf8');

    const args = ['replace-symbol-body'];
    args.push(...(await this.utils.getSolutionOrProjectArgs()));
    args.push('--relative', String(relative).replace(/\\\\/g, '/'));
    args.push('--name-path', String(namePath));
    args.push('--body-file', bodyFile);
    if (apply) args.push('--apply', 'true');
    try {
      const res = await this.utils.runCli(args);
      return res;
    } finally {
      try { await fs.promises.rm(tmp, { recursive: true, force: true }); } catch {}
    }
  }
}

