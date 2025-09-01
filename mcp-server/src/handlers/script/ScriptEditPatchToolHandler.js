import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { WriteGate } from '../../core/writeGate.js';
import { getWriteQueue } from '../../core/globalWriteQueue.js';
import { config } from '../../core/config.js';

export class ScriptEditPatchToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_edit_patch',
            'Apply line‑based patches to C# files with preview and safety thresholds. BEST PRACTICES: Always use preview=true first to check changes. Watch for proximity warnings when edits are close together (within proximityThreshold lines). For multiple edits, process sequentially as each edit shifts line numbers. Use defer=true for batch operations. Check minClusterSize warnings for overlapping edits.',
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

        const { edits } = params;

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
        return this.writeGate.sendWithGate('script_edit_patch', params, { preview });
    }
}
