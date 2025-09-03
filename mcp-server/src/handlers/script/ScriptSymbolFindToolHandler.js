import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';

export class ScriptSymbolFindToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_symbol_find',
            'Find symbol definitions by name (class/method/field/property) using external Roslyn CLI（Unity無通信）。',
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
        const { name, kind } = params;
        const args = ['find-symbol'];
        args.push(...(await this.roslyn.getSolutionOrProjectArgs()));
        args.push('--name', String(name));
        if (kind) args.push('--kind', String(kind));
        const res = await this.roslyn.runCli(args);
        // Map to legacy shape: { path, symbol }
        const results = (res.results || []).map(r => ({
            path: r.path,
            symbol: {
                name: r.name,
                kind: r.kind,
                namespace: r.ns,
                container: r.container,
                startLine: r.line,
                startColumn: r.column,
                endLine: r.line,
                endColumn: r.column
            }
        }));
        return { success: true, results, total: results.length };
    }
}
