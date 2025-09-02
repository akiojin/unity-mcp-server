import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';

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
        this.roslyn = new RoslynCliUtils(unityConnection);
    }

    validate(params) {
        super.validate(params);

        const { name } = params;

        if (!name || name.trim() === '') {
            throw new Error('name cannot be empty');
        }
    }

    async execute(params) {
        const { name, path } = params;
        const args = ['find-references'];
        args.push(...(await this.roslyn.getSolutionOrProjectArgs()));
        args.push('--name', String(name));
        if (path) args.push('--relative', String(path).replace(/\\\\/g, '/'));
        const res = await this.roslyn.runCli(args);
        return { success: true, results: res.results || [], total: (res.results || []).length, truncated: false };
    }
}
