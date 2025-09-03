import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';
import { CodeIndex } from '../../core/codeIndex.js';

export class BuildCodeIndexToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'build_code_index',
      'Build a persistent SQLite symbol index using roslyn-cli scan-symbols. Stores DB under Library/UnityMCP/CodeIndex/code-index.db.',
      {
        type: 'object',
        properties: {},
        required: []
      }
    );
    this.unityConnection = unityConnection;
    this.roslyn = new RoslynCliUtils(unityConnection);
    this.index = new CodeIndex(unityConnection);
  }

  async execute() {
    const args = ['scan-symbols'];
    args.push(...(await this.roslyn.getSolutionOrProjectArgs()));
    const res = await this.roslyn.runCli(args);
    const symbols = res.results || [];
    const r = await this.index.clearAndLoad(symbols);
    const stats = await this.index.getStats();
    return { success: true, inserted: r.total, total: stats.total, lastIndexedAt: stats.lastIndexedAt };
  }
}

