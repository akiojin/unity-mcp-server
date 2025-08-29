import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { WriteGate } from '../../core/writeGate.js';

export class ScriptEditPatchToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_edit_patch',
            'Apply line‑based patches to C# files with preview and safety thresholds.',
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
                                    description: 'Relative Unity project path to edit (e.g., Assets/Scripts/Foo.cs).'
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
                    }
                },
                required: ['edits']
            }
        );
        this.unityConnection = unityConnection;
        this.writeGate = new WriteGate(unityConnection);
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
        // Previewはノーゲート、適用はゲートを通す
        const preview = params?.preview === true;
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }
        return this.writeGate.sendWithGate('script_edit_patch', params, { preview });
    }
}
