import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';

export class ScriptEditStructuredToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_edit_structured',
            'PRIORITY: Use this for ALL code changes. Perform structured edits (insert_before/insert_after/replace_body) on a known symbol. Required params: path (file under Assets/ or Packages/), symbolName (prefer container path e.g. MyType/Nested/Foo). Guidance: (1) Locate targets with script_symbols_get first, (2) insert_* must target a class/namespace (never a method), (3) replace_body must be a self-contained body including braces, (4) preview is for diagnostics only — apply proceeds even if diagnostics exist; errors are returned. LLM summary limits: errors≤30 (message≤200 chars, file≤260), large text (preview/diff/text/content)≤1000 chars with Truncated flag.',
            {
                type: 'object',
                properties: {
                    operation: {
                        type: 'string',
                        enum: ['insert_before', 'insert_after', 'replace_body'],
                        description: 'Edit type: insert_before, insert_after, or replace_body.'
                    },
                    path: {
                        type: 'string',
                        description: 'Project-relative C# path starting with Assets/ or Packages/ (e.g., Packages/unity-editor-mcp/Editor/Foo.cs). Do NOT prefix repository folders like UnityEditorMCP/….'
                    },
                    symbolName: {
                        type: 'string',
                        description: 'Target symbol name (e.g., class/method/field name).'
                    },
                    kind: {
                        type: 'string',
                        description: 'Symbol kind (e.g., class, method, field, property). Optional but improves precision.'
                    },
                    newText: {
                        type: 'string',
                        description: 'Text to insert or use as replacement body.'
                    },
                    preview: {
                        type: 'boolean',
                        default: false,
                        description: 'If true, returns a preview without writing files. Default=false to reduce large diff payloads.'
                    }
                },
                required: ['operation', 'path', 'symbolName']
            }
        );
        this.unityConnection = unityConnection;
        this.roslyn = new RoslynCliUtils(unityConnection);
    }

    validate(params) {
        super.validate(params);

        const { operation, path, symbolName, kind } = params;

        const validOperations = ['insert_before', 'insert_after', 'replace_body'];
        if (!validOperations.includes(operation)) {
            throw new Error(`Invalid operation: ${operation}`);
        }

        if (!path || path.trim() === '') {
            throw new Error('path cannot be empty');
        }

        if (!symbolName || symbolName.trim() === '') {
            throw new Error('symbolName cannot be empty');
        }

        // Safety guard: forbid inserting members into a method scope
        if ((operation === 'insert_after' || operation === 'insert_before') && (kind || '').toLowerCase() === 'method') {
            throw new Error('Insert operations must target class/namespace, not method scope. Use kind:"class" and insert at class level.');
        }
    }

    async execute(params) {
        // Normalize to project-relative path
        const raw = String(params.path).replace(/\\\\/g, '/');
        const ai = raw.indexOf('Assets/');
        const pi = raw.indexOf('Packages/');
        const idx = (ai >= 0 && pi >= 0) ? Math.min(ai, pi) : (ai >= 0 ? ai : pi);
        const relative = idx >= 0 ? raw.substring(idx) : raw;

        const operation = String(params.operation);
        const kind = (params.kind || '').toLowerCase();
        const symbolName = String(params.symbolName);
        const preview = params?.preview === true;
        const body = String(params.newText || '');

        // Map: replace_body -> roslyn_replace_symbol_body, insert_* -> roslyn_insert_symbol
        if (operation === 'replace_body') {
            // Construct namePath: if only method name provided, assume within a class? We pass "Class/Method" if possible is unknown here.
            // To keep behavior, accept simple symbolName and let CLI resolve within file scope: namePath = symbolName
            const tmpParams = {
                relative,
                namePath: symbolName,
                body,
                apply: !preview
            };
            // Build CLI args
            const args = ['replace-symbol-body'];
            args.push(...(await this.roslyn.getSolutionOrProjectArgs()));
            args.push('--relative', relative, '--name-path', tmpParams.namePath);
            // write body to temp and call through RoslynCliUtils helper would duplicate logic; inline minimal here:
            // Simpler approach: delegate to roslyn_replace_symbol_body tool handler via CLI util wrapper not included; do CLI with temp file below.
        }

        // Fallback: delegate to specialized handlers for clarity
        if (operation === 'insert_before' || operation === 'insert_after') {
            const cmd = operation === 'insert_before' ? 'insert-before-symbol' : 'insert-after-symbol';
            const args = [cmd];
            args.push(...(await this.roslyn.getSolutionOrProjectArgs()));
            args.push('--relative', relative, '--name-path', symbolName);
            // temp file for body
            const fs = await import('fs');
            const os = await import('os');
            const path = await import('path');
            const tmp = await fs.promises.mkdtemp(path.default.join(os.default.tmpdir(), 'roslyn-insert-'));
            const bodyFile = path.default.join(tmp, 'insert.txt');
            await fs.promises.writeFile(bodyFile, body, 'utf8');
            args.push('--body-file', bodyFile);
            if (!preview) args.push('--apply', 'true');
            try {
                const res = await this.roslyn.runCli(args);
                return this._summarizeResult(res, { preview });
            } finally {
                try { await fs.promises.rm(tmp, { recursive: true, force: true }); } catch {}
            }
        }

        if (operation === 'replace_body') {
            const fs = await import('fs');
            const os = await import('os');
            const path = await import('path');
            const tmp = await fs.promises.mkdtemp(path.default.join(os.default.tmpdir(), 'roslyn-body-'));
            const bodyFile = path.default.join(tmp, 'body.txt');
            await fs.promises.writeFile(bodyFile, body, 'utf8');
            const args = ['replace-symbol-body'];
            args.push(...(await this.roslyn.getSolutionOrProjectArgs()));
            args.push('--relative', relative, '--name-path', symbolName, '--body-file', bodyFile);
            if (!preview) args.push('--apply', 'true');
            try {
                const res = await this.roslyn.runCli(args);
                return this._summarizeResult(res, { preview });
            } finally {
                try { await fs.promises.rm(tmp, { recursive: true, force: true }); } catch {}
            }
        }

        return { error: `Unsupported operation: ${operation}` };
    }

    /**
     * Summarize/trim Roslyn CLI payloads to avoid huge token usage.
     * - Caps error items and message lengths
     * - Trims large text fields (e.g., preview/diff) to a short excerpt
     */
    _summarizeResult(res, { preview }) {
        if (!res || typeof res !== 'object') return res;

        const MAX_ERRORS = 30;
        const MAX_MSG_LEN = 200;
        const MAX_TEXT_LEN = 1000; // generic cap for any preview-like text

        const out = {};
        // Preserve common flags if present
        if ('id' in res) out.id = res.id;
        if ('success' in res) out.success = !!res.success;
        if ('applied' in res) out.applied = !!res.applied;

        // Errors trimming
        if (Array.isArray(res.errors)) {
            const trimmed = res.errors.slice(0, MAX_ERRORS).map(e => {
                const obj = {};
                if (e && typeof e === 'object') {
                    if ('id' in e) obj.id = e.id;
                    if ('message' in e) obj.message = this._trimString(String(e.message), MAX_MSG_LEN);
                    if ('file' in e) obj.file = this._trimString(String(e.file), 260);
                    if ('line' in e) obj.line = e.line;
                    if ('column' in e) obj.column = e.column;
                } else {
                    obj.message = this._trimString(String(e), MAX_MSG_LEN);
                }
                return obj;
            });
            out.errorCount = trimmed.length; // summarized count (<= MAX_ERRORS)
            out.totalErrors = res.errors.length; // raw count for reference
            out.errors = trimmed;
        }

        // Propagate workspace info if present (which .sln/.csproj is open)
        // workspace情報は返さない（厳格: .sln必須のため）

        // Generic handling for any large text properties commonly returned by tools
        for (const key of ['preview', 'diff', 'text', 'content']) {
            if (typeof res[key] === 'string' && res[key].length > 0) {
                out[key] = this._trimString(res[key], MAX_TEXT_LEN);
                if (res[key].length > MAX_TEXT_LEN) out[`${key}Truncated`] = true;
            }
        }

        // Echo minimal identifiers to aid clients
        for (const key of ['operation', 'path', 'relative', 'symbolName']) {
            if (res[key] !== undefined) out[key] = res[key];
        }

        return Object.keys(out).length ? out : res;
    }

    _trimString(s, max) {
        if (typeof s !== 'string') return s;
        return s.length > max ? (s.slice(0, max) + '…') : s;
    }
}
