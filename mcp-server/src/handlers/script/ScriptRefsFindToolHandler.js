import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';
import { CodeIndex } from '../../core/codeIndex.js';

export class ScriptRefsFindToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_refs_find',
            'Find code references/usages using external Roslyn CLI (no Unity comms). LLM-friendly paging/summary: respects pageSize and maxBytes, caps matches per file (maxMatchesPerFile), and trims snippet text to ~400 chars. Use scope/name/kind/path to narrow results.',
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
        const {
            name,
            path,
            kind,
            namespace,
            container,
            scope = 'all',
            pageSize = 50,
            maxBytes = 1024 * 64,
            snippetContext = 2, // 現状CLIは±1行固定。ハンドラ側では文字数トリムのみ行う。
            maxMatchesPerFile = 5
        } = params;

        // Roslyn CLIへ委譲
        const args = ['find-references'];
        args.push(...(await this.roslyn.getSolutionOrProjectArgs()));
        args.push('--name', String(name));
        if (path) args.push('--relative', String(path).replace(/\\\\/g, '/'));

        const res = await this.roslyn.runCli(args);
        let raw = Array.isArray(res?.results) ? res.results : [];

        // スコープ絞り込み
        if (scope && scope !== 'all') {
            raw = raw.filter(r => {
                const p = (r.path || '').replace(/\\\\/g, '/');
                switch (scope) {
                    case 'assets': return p.startsWith('Assets/');
                    case 'packages': return p.startsWith('Packages/') || p.startsWith('Library/PackageCache/');
                    case 'embedded': return p.startsWith('Packages/');
                    default: return true;
                }
            });
        }

        // ファイル毎の件数制限 + スニペット文字数トリム
        const MAX_SNIPPET = 400;
        const perFile = new Map();
        for (const item of raw) {
            const key = (item.path || '').replace(/\\\\/g, '/');
            const list = perFile.get(key) || [];
            if (list.length < maxMatchesPerFile) {
                if (typeof item.snippet === 'string' && item.snippet.length > MAX_SNIPPET) {
                    item.snippet = item.snippet.slice(0, MAX_SNIPPET) + '…';
                    item.snippetTruncated = true;
                }
                list.push(item);
                perFile.set(key, list);
            }
        }

        // ページング/サイズ上限
        const results = [];
        let bytes = 0;
        for (const [_, arr] of perFile) {
            for (const it of arr) {
                const json = JSON.stringify(it);
                const size = Buffer.byteLength(json, 'utf8');
                if (results.length >= pageSize || (bytes + size) > maxBytes) {
                    return { success: true, results, total: results.length, truncated: true };
                }
                results.push(it);
                bytes += size;
            }
        }

        const out = { success: true, results, total: results.length, truncated: false };
        if (res && res.workspace) {
            out.workspace = {
                key: res.workspace.key,
                kind: res.workspace.kind,
                rootDir: res.workspace.rootDir
            };
        }
        return out;
    }
}
