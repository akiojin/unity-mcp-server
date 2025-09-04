import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';

export class ScriptIndexStatusToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_index_status',
            'Report code index status and readiness for symbol/search operations. BEST PRACTICES: Check before heavy symbol operations. Shows total files indexed and coverage percentage. If coverage is low, some symbol operations may be incomplete. Index is automatically built on first use. No parameters needed - lightweight status check.',
            {
                type: 'object',
                properties: {},
                required: []
            }
        );
        this.unityConnection = unityConnection;
        this.projectInfo = new ProjectInfoProvider(unityConnection);
    }

  async execute(params) {
        // まず永続インデックスの有無を確認。未構築なら明示エラーで build_code_index を促す。
        const { CodeIndex } = await import('../../core/codeIndex.js');
        const idx = new CodeIndex(this.unityConnection);
        const ready = await idx.isReady();
        if (!ready) {
            return { success: false, error: 'index_not_built', message: 'Code index is not built. Please run UnityMCP.build_code_index first.' };
        }

        // 構築済みなら roslyn-cli 経由で総ファイル数を取得
        try {
            const { RoslynCliUtils } = await import('../roslyn/RoslynCliUtils.js');
            const roslyn = new RoslynCliUtils(this.unityConnection);
            const args = ['index-summary'];
            args.push(...(await roslyn.getSolutionOrProjectArgs()));
            const res = await roslyn.runCli(args);
            const total = res.totalFiles ?? 0;
            const stats = await idx.getStats();
            const coverage = total > 0 ? Math.min(1, stats.total / total) : 0;
            return { success: true, totalFiles: total, indexedFiles: stats.total, coverage, breakdown: res.breakdown, index: { ready: true, rows: stats.total, lastIndexedAt: stats.lastIndexedAt } };
        } catch (e) {
            return { success: false, error: 'roslyn_cli_unavailable', message: e.message };
        }
  }
}
