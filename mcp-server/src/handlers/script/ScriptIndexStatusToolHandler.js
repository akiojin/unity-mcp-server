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
        // まず永続インデックスの有無を確認。未構築なら明示エラーで code_index_build を促す。
        const { CodeIndex } = await import('../../core/codeIndex.js');
        const idx = new CodeIndex(this.unityConnection);
        const ready = await idx.isReady();
        if (!ready) {
            return { success: false, error: 'index_not_built', message: 'Code index is not built. Please run UnityMCP.code_index_build first.' };
        }

        // 構築済みなら .cs 総数をローカル走査で取得（軽量）
        const info = await this.projectInfo.get();
        const fs = await import('fs');
        const path = await import('path');
        const roots = [
            path.default.resolve(info.projectRoot, 'Assets'),
            path.default.resolve(info.projectRoot, 'Packages'),
            path.default.resolve(info.projectRoot, 'Library/PackageCache'),
        ];
        let total = 0; const breakdown = { assets: 0, packages: 0, packageCache: 0, other: 0 };
        const walk = (dir) => {
            try {
                if (!fs.default.existsSync(dir)) return;
                const st = fs.default.statSync(dir);
                if (st.isFile()) {
                    if (dir.endsWith('.cs')) {
                        total++;
                        const rel = dir.replace(/\\\\/g, '/').replace(info.projectRoot.replace(/\\\\/g,'/'), '').replace(/^\//,'');
                        if (rel.startsWith('Assets/')) breakdown.assets++; else if (rel.startsWith('Packages/')) breakdown.packages++; else if (rel.includes('Library/PackageCache/')) breakdown.packageCache++; else breakdown.other++;
                    }
                    return;
                }
                for (const e of fs.default.readdirSync(dir)) {
                    if (e === 'obj' || e === 'bin' || e.startsWith('.')) continue;
                    walk(path.default.join(dir, e));
                }
            } catch {}
        };
        for (const r of roots) walk(r);
        const stats = await idx.getStats();
        const coverage = total > 0 ? Math.min(1, stats.total / total) : 0;
        return { success: true, totalFiles: total, indexedFiles: stats.total, coverage, breakdown, index: { ready: true, rows: stats.total, lastIndexedAt: stats.lastIndexedAt } };
  }
}
