import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { findReferences } from '../../utils/codeIndex.js';
import { logger } from '../../core/config.js';

export class ScriptRefsFindToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_refs_find',
            'Find code references/usages of a symbol across the project with context and limits. BEST PRACTICES: Essential for understanding code dependencies. Use container/namespace/kind to narrow search. Set snippetContext for surrounding code lines. Use maxMatchesPerFile to limit results per file. Set maxBytes to control response size. Great for impact analysis before refactoring.',
            {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Symbol name to search usages for.'
                    },
                    scope: {
                        type: 'string',
                        enum: ['assets', 'packages', 'embedded', 'all'],
                        default: 'assets',
                        description: 'Search scope: assets (Assets/), packages (Packages/), embedded, or all.'
                    },
                    snippetContext: {
                        type: 'number',
                        description: 'Number of context lines to include around each match.'
                    },
                    maxMatchesPerFile: {
                        type: 'number',
                        description: 'Cap reference matches returned per file.'
                    },
                    pageSize: {
                        type: 'number',
                        description: 'Maximum results to return per page.'
                    },
                    maxBytes: {
                        type: 'number',
                        description: 'Maximum response size (bytes) to keep outputs LLM‑friendly.'
                    },
                    container: {
                        type: 'string',
                        description: 'Optional: container (class) of the symbol.'
                    },
                    namespace: {
                        type: 'string',
                        description: 'Optional: namespace of the symbol.'
                    },
                    path: {
                        type: 'string',
                        description: 'Optional: constrain to file path containing the symbol.'
                    },
                    kind: {
                        type: 'string',
                        description: 'Optional: symbol kind (class, method, field, property).'
                    }
                },
                required: ['name']
            }
        );
        this.unityConnection = unityConnection;
        this.projectInfo = new ProjectInfoProvider(unityConnection);
    }

    validate(params) {
        super.validate(params);

        const { name } = params;

        if (!name || name.trim() === '') {
            throw new Error('name cannot be empty');
        }
    }

    async execute(params) {
        const {
            name,
            scope = 'assets',
            snippetContext = 2,
            maxMatchesPerFile = 5,
            pageSize = 50,
            maxBytes = 64 * 1024
        } = params;

        try {
            const info = await this.projectInfo.get();
            const roots = [];
            if (scope === 'assets' || scope === 'all') roots.push(info.assetsPath);
            if (scope === 'packages' || scope === 'embedded' || scope === 'all') roots.push(info.packagesPath);
            const { results, truncated } = await findReferences(info.projectRoot, roots, { name, snippetContext, maxMatchesPerFile, pageSize, maxBytes });
            return { success: true, results, total: results.length, truncated };
        } catch (e) {
            logger.warn(`[script_refs_find] local failed, falling back to Unity: ${e.message}`);
            if (!this.unityConnection.isConnected()) {
                await this.unityConnection.connect();
            }
            return this.unityConnection.sendCommand('script_refs_find', params);
        }
    }
}
