import fs from 'fs';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from './RoslynCliUtils.js';

export class RoslynInsertSymbolToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'roslyn_insert_symbol',
      'Insert text before/after a symbol using external Roslyn CLI with preflight (no Unity communication).',
      {
        type: 'object',
        properties: {
          relative: { type: 'string', description: 'Project-relative file path' },
          namePath: { type: 'string', description: 'Symbol path like Class/Member' },
          body: { type: 'string', description: 'Text to insert. A trailing newline will be ensured.' },
          position: { type: 'string', enum: ['before','after'], description: 'Insert position relative to symbol' },
          apply: { type: 'boolean', default: false },
        },
        required: ['relative','namePath','body','position']
      }
    );
    this.utils = new RoslynCliUtils(unityConnection);
  }

  async execute(params) {
    const { relative, namePath, body, position, apply = false } = params;
    const tmp = await fs.promises.mkdtemp(require('os').tmpdir() + '/roslyn-insert-');
    const bodyFile = `${tmp}/insert.txt`;
    await fs.promises.writeFile(bodyFile, String(body), 'utf8');
    const cmd = position === 'before' ? 'insert-before-symbol' : 'insert-after-symbol';
    const args = [cmd];
    args.push(...(await this.utils.getSolutionOrProjectArgs()));
    args.push('--relative', String(relative).replace(/\\\\/g, '/'));
    args.push('--name-path', String(namePath));
    args.push('--body-file', bodyFile);
    if (apply) args.push('--apply', 'true');
    try {
      return await this.utils.runCli(args);
    } finally {
      try { await fs.promises.rm(tmp, { recursive: true, force: true }); } catch {}
    }
  }
}

