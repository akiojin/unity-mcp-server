import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptEditPatchToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_edit_patch',
            'Apply patches to Unity script files with preview support',
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
                                    description: 'Path to the file to edit'
                                },
                                startLine: {
                                    type: 'number',
                                    description: 'Starting line number (1-based)'
                                },
                                endLine: {
                                    type: 'number',
                                    description: 'Ending line number'
                                },
                                newText: {
                                    type: 'string',
                                    description: 'New text to replace the lines'
                                }
                            },
                            required: ['path', 'startLine', 'endLine', 'newText']
                        },
                        description: 'Array of edit operations'
                    },
                    preview: {
                        type: 'boolean',
                        default: true,
                        description: 'Whether to preview changes only'
                    },
                    proximityThreshold: {
                        type: 'number',
                        default: 3,
                        description: 'Lines threshold for proximity warnings'
                    },
                    minClusterSize: {
                        type: 'number',
                        default: 2,
                        description: 'Minimum cluster size for proximity warnings'
                    }
                },
                required: ['edits']
            }
        );
        this.unityConnection = unityConnection;
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
        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('script_edit_patch', params);

        return result;
    }
}
