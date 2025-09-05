import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { CodeIndex } from '../../core/codeIndex.js';
import { LspRpcClient } from '../../lsp/LspRpcClient.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';

export class ScriptSymbolFindToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_symbol_find',
            'Find symbol definitions by name (class/method/field/property) using the bundled C# LSP. Guidance: prefer narrowing by kind and set exact=true when possible; use scope=assets|packages to avoid large outputs. Use results (container, namespace) to construct container namePath like Outer/Nested/Member for subsequent edit tools.',
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
                        description: 'Search scope: assets (Assets/), packages (Packages/), embedded, or all (default: all).'
                    },
                    exact: {
                        type: 'boolean',
                        description: 'If true, match name exactly; otherwise allows partial matches (default: false).'
                    }
                },
                required: ['name']
            }
        );
        this.unityConnection = unityConnection;
        this.index = new CodeIndex(unityConnection);
        this.projectInfo = new ProjectInfoProvider(unityConnection);
        this.lsp = null;
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
            const info = await this.projectInfo.get();
            if (!this.lsp) this.lsp = new LspRpcClient(info.projectRoot);
            const resp = await this.lsp.request('workspace/symbol', { query: String(name) });
            const arr = resp?.result || [];
            results = arr.map(s => ({
                path: (s.location?.uri || '').replace('file://',''),
                symbol: {
                    name: s.name,
                    kind: this.mapKind(s.kind),
                    namespace: null,
                    container: null,
                    startLine: (s.location?.range?.start?.line ?? 0) + 1,
                    startColumn: (s.location?.range?.start?.character ?? 0) + 1,
                    endLine: (s.location?.range?.end?.line ?? 0) + 1,
                    endColumn: (s.location?.range?.end?.character ?? 0) + 1,
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
                    case 'embedded': return p.startsWith('Packages/');                }
            });
        }
        if (exact) {
            const target = String(name);
            results = results.filter(x => x.symbol && x.symbol.name === target);
        }
        return { success: true, results, total: results.length };
    }

    mapKind(k) {
        switch(k){
            case 5: return 'class';
            case 23: return 'struct';
            case 11: return 'interface';
            case 10: return 'enum';
            case 6: return 'method';
            case 7: return 'property';
            case 8: return 'field';        }
    }
}
