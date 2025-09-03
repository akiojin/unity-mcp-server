import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';
import { CodeIndex } from '../../core/codeIndex.js';

export class ScriptRefsFindToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_refs_find',
            'Find code references/usages using external Roslyn CLI（Unity無通信）。',
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
                        default: 'all',
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
        this.roslyn = new RoslynCliUtils(unityConnection);
        this.index = new CodeIndex(unityConnection);
    }

    validate(params) {
        super.validate(params);

        const { name } = params;

        if (!name || name.trim() === '') {
            throw new Error('name cannot be empty');
        }
    }

    async execute(params) {
        const { name, path, scope = 'all' } = params;
        let results = [];
        if (await this.index.isReady()) {
            // DBには使用箇所のスパンは保持していないため、現時点では参照検索はRoslynに委譲
            // ただし将来の拡張でトークン位置を保持する設計に移行可能
        }
        const args = ['find-references'];
        args.push(...(await this.roslyn.getSolutionOrProjectArgs()));
        args.push('--name', String(name));
        if (path) args.push('--relative', String(path).replace(/\\\\/g, '/'));
        const res = await this.roslyn.runCli(args);
        results = res.results || [];
        if (scope && scope !== 'all') {
            results = results.filter(r => {
                const p = (r.path || '').replace(/\\\\/g, '/');
                switch (scope) {
                    case 'assets': return p.startsWith('Assets/');
                    case 'packages': return p.startsWith('Packages/') || p.startsWith('Library/PackageCache/');
                    case 'embedded': return p.startsWith('Packages/');
                    default: return true;
                }
            });
        }
        return { success: true, results, total: results.length, truncated: false };
    }
}
