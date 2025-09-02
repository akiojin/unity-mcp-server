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
            await this.projectInfo.get();
            // 旧ローカル/Unityインデックスを廃止。固定の軽量応答を返す。
            return { success: true, totalFiles: 0, indexedFiles: 0, coverage: 0 };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}
