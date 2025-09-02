import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { indexStatus } from '../../utils/codeIndex.js';
import { logger } from '../../core/config.js';

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
            const info = await this.projectInfo.get();
            const roots = [info.assetsPath, info.packagesPath];
            const status = await indexStatus(info.projectRoot, info.codeIndexRoot, roots);
            return status;
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}
