import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';
import { CodeIndex } from '../../core/codeIndex.js';

export class ScriptSymbolFindToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_symbol_find',
            'Find symbol definitions by name (class/method/field/property) using external Roslyn CLI (no Unity comms). Guidance: prefer narrowing by kind and set exact=true when possible; use scope=assets|packages to avoid large outputs. Use results (container, namespace) to construct container namePath like Outer/Nested/Member for subsequent edit tools.',
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
                        default: 'all',
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
        const { name, kind, scope = 'assets', exact = false } = params;
        // Prefer persistent index if available
        let results = [];
        if (await this.index.isReady()) {
            const rows = await this.index.querySymbols({ name, kind, scope, exact });
            results = rows.map(r => ({
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
        } else {
            const args = ['find-symbol'];
            args.push(...(await this.roslyn.getSolutionOrProjectArgs()));
            args.push('--name', String(name));
            if (kind) args.push('--kind', String(kind));
            const res = await this.roslyn.runCli(args);
            // Map to legacy shape: { path, symbol }
            results = (res.results || []).map(r => ({
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
        }
        // Optional post-filtering: scope and exact name
        if (scope && scope !== 'all') {
            results = results.filter(x => {
                const p = (x.path || '').replace(/\\\\/g, '/');
                switch (scope) {
                    case 'assets': return p.startsWith('Assets/');
                    case 'packages': return p.startsWith('Packages/') || p.startsWith('Library/PackageCache/');
                    case 'embedded': return p.startsWith('Packages/');
                    default: return true;
                }
            });
        }
        if (exact) {
            const target = String(name);
            results = results.filter(x => x.symbol && x.symbol.name === target);
        }
        return { success: true, results, total: results.length };
    }
}
