import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { findSymbols } from '../../utils/codeIndex.js';
import { logger } from '../../core/config.js';

export class ScriptSymbolFindToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_symbol_find',
            'Find symbol definitions by name (class/method/field/property) across the project. BEST PRACTICES: Use exact=true for precise matches, false for fuzzy search. Specify "kind" to filter by symbol type. Searches across all scopes by default. Returns symbol location with line/column info. Great for navigation and refactoring preparation.',
            {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Symbol name to search (exact or fuzzy based on "exact").'
                    },
                    kind: {
                        type: 'string',
                        description: 'Optional: narrow by symbol kind (class, method, field, property).'
                    },
                    scope: {
                        type: 'string',
                        enum: ['assets', 'packages', 'embedded', 'all'],
                        default: 'assets',
                        description: 'Search scope: assets (Assets/), packages (Packages/), embedded, or all.'
                    },
                    exact: {
                        type: 'boolean',
                        default: false,
                        description: 'If true, match name exactly; otherwise allows partial matches.'
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
            kind,
            scope = 'assets',
            exact = false
        } = params;

        try {
            const info = await this.projectInfo.get();
            const roots = [];
            if (scope === 'assets' || scope === 'all') roots.push(info.assetsPath);
            if (scope === 'packages' || scope === 'embedded' || scope === 'all') roots.push(info.packagesPath);

            const results = [];
            for await (const hit of findSymbols(info.projectRoot, info.codeIndexRoot, roots, { name, kind, exact, limit: 200 })) {
                results.push({ path: hit.path, symbol: hit.symbol });
                if (results.length >= 200) break;
            }
            return { success: true, results, total: results.length };
        } catch (e) {
            logger.warn(`[script_symbol_find] local failed, falling back to Unity: ${e.message}`);
            if (!this.unityConnection.isConnected()) {
                await this.unityConnection.connect();
            }
            return this.unityConnection.sendCommand('script_symbol_find', { name, kind, scope, exact });
        }
    }
}
