import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { WriteGate } from '../../core/writeGate.js';
import { getWriteQueue } from '../../core/globalWriteQueue.js';
import { config } from '../../core/config.js';

export class ScriptEditPatchToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_edit_patch',
            'LAST RESORT: Line‑based patching (high risk of brace errors). Prefer script_edit_structured for edits. Safe use: small, localized replacements that DO NOT cross symbol boundaries. Recommended: preview=true for risky changes. To reduce tokens, avoid large diffs. The server enforces safeMode by default and rejects large patches; use allowLarge=true only if you fully understand the risks.',
            {
                type: 'object',
                properties: {
                    edits: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: 'Project-relative C# path starting with Assets/ or Packages/ (e.g., Packages/unity-editor-mcp/Editor/Foo.cs). Do NOT prefix repository folders like UnityEditorMCP/… — the MCP server runs inside the Unity project.'
                                },
                                startLine: {
                                    type: 'number',
                                    description: 'Starting line (1-based, inclusive).'
                                },
                                endLine: {
                                    type: 'number',
                                    description: 'Ending line (inclusive).'
                                },
                                newText: {
                                    type: 'string',
                                    description: 'Replacement text for the specified range.'
                                }
                            },
                            required: ['path', 'startLine', 'endLine', 'newText']
                        },
                        description: 'Edit operations to apply (processed sequentially).'
                    },
                    preview: {
                        type: 'boolean',
                        default: true,
                        description: 'If true, returns a preview/diff without writing files.'
                    },
                    proximityThreshold: {
                        type: 'number',
                        default: 3,
                        description: 'Warn if edits are within this many lines (helps detect overlapping edits).'
                    },
                    minClusterSize: {
                        type: 'number',
                        default: 2,
                        description: 'Warn when clustered edit count reaches this size.'
                    },
                    defer: {
                        type: 'boolean',
                        description: 'If true, enqueue into write queue and batch apply after debounce. If false, apply immediately.'
                    },
                    safeMode: {
                        type: 'boolean',
                        default: true,
                        description: 'When true (default), rejects large edits and nudges you to use script_edit_structured.'
                    },
                    allowLarge: {
                        type: 'boolean',
                        default: false,
                        description: 'Override guard to allow large line ranges. Use with extreme caution.'
                    }
                },
                required: ['edits']
            }
        );
        this.unityConnection = unityConnection;
        this.writeGate = new WriteGate(unityConnection);
        this.writeQueue = getWriteQueue(unityConnection);
    }

    validate(params) {
        super.validate(params);

        const { edits, safeMode = true, allowLarge = false } = params;

        if (!Array.isArray(edits) || edits.length === 0) {
            throw new Error('edits must be a non-empty array');
        }

        // Validate each edit
        edits.forEach((edit, index) => {
            if (!edit.path || edit.path.trim() === '') {
                throw new Error(`edits[${index}].path cannot be empty`);
            }
            if (edit.startLine < 1) {
                throw new Error(`edits[${index}].startLine must be at least 1`);
            }
            if (edit.endLine < edit.startLine) {
                throw new Error(`edits[${index}].endLine cannot be less than startLine`);
            }

            const span = (edit.endLine - edit.startLine + 1);
            // Guardrail: discourage large destructive patches that often break braces
            if (safeMode && !allowLarge && span > 80) {
                throw new Error(`edits[${index}] spans ${span} lines (>80). Use script_edit_structured (replace_body/insert_after) or pass allowLarge:true if you accept the risks.`);
            }
        });
    }

    async execute(params) {
        // Path normalization: allow accidental repo-root prefixes (e.g., UnityEditorMCP/Packages/…)
        if (Array.isArray(params?.edits)) {
            params.edits = params.edits.map(e => {
                if (!e?.path) return e;
                const raw = String(e.path).replace(/\\\\/g, '/');
                const ai = raw.indexOf('Assets/');
                const pi = raw.indexOf('Packages/');
                const i = (ai >= 0 && pi >= 0) ? Math.min(ai, pi) : (ai >= 0 ? ai : pi);
                const norm = i >= 0 ? raw.substring(i) : raw;
                return { ...e, path: norm };
            });
        }
        const preview = params?.preview === true;
        const deferDefault = (config.writeQueue && typeof config.writeQueue.deferDefault === 'boolean') ? config.writeQueue.deferDefault : true;
        const defer = typeof params?.defer === 'boolean' ? params.defer : deferDefault; // 設定既定→引数で上書き
        if (preview === false && defer) {
            // バッチキューへ投入して即ACK
            const enq = this.writeQueue.enqueuePatch(params);
            return { status: enq.status === 'queued' ? 'success' : 'error', result: enq };
        }
        // 直ちに適用（プレビュー or defer=false）
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }
        const res = await this.writeGate.sendWithGate('script_edit_patch', params, { preview });
        // Do not rely on lastCompilationMessages; fetch errors from Console instead
        try {
            const console = await this.unityConnection.sendCommand('read_console', {
                count: 100,
                includeStackTrace: false,
                logTypes: ['Error', 'Exception'],
                format: 'compact',
                sortOrder: 'newest',
            });
            return { ...res, consoleErrors: console?.logs || [] };
        } catch {
            return res;
        }
    }
}
