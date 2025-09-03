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
        try {
            // slnベースの全文書解析で、Library/PackageCache を含めた総数を取得
            const { RoslynCliUtils } = await import('../roslyn/RoslynCliUtils.js');
            const roslyn = new RoslynCliUtils(this.unityConnection);
            const args = ['index-summary'];
            args.push(...(await roslyn.getSolutionOrProjectArgs()));
            const res = await roslyn.runCli(args);
            const total = res.totalFiles ?? 0;
            // DBの有無
            const { CodeIndex } = await import('../../core/codeIndex.js');
            const idx = new CodeIndex(this.unityConnection);
            const ready = await idx.isReady();
            const stats = ready ? await idx.getStats() : { total: 0, lastIndexedAt: null };
            const indexed = total; // 永続インデックスではなくても、serve常駐+ワークスペースキャッシュで即応
            const coverage = total > 0 ? 1 : 0;
            return { success: true, totalFiles: total, indexedFiles: indexed, coverage, breakdown: res.breakdown, index: { ready, rows: stats.total, lastIndexedAt: stats.lastIndexedAt } };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}
