import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptRefactorRenameToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_refactor_rename',
            'Rename symbols (classes, methods, variables) across the codebase',
            {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Current name of the symbol'
                    },
                    newName: {
                        type: 'string',
                        description: 'New name for the symbol'
                    },
                    scope: {
                        type: 'string',
                        enum: ['assets', 'packages', 'embedded', 'all'],
                        default: 'assets',
                        description: 'Search scope'
                    },
                    preview: {
                        type: 'boolean',
                        default: true,
                        description: 'Whether to preview changes only'
                    },
                    maxMatchesPerFile: {
                        type: 'number',
                        description: 'Maximum matches per file'
                    },
                    pageSize: {
                        type: 'number',
                        description: 'Maximum files to process'
                    },
                    allowCollisions: {
                        type: 'boolean',
                        default: false,
                        description: 'Allow rename even if collisions detected'
                    },
                    includeSemantic: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                container: { type: 'string' },
                                namespace: { type: 'string' }
                            }
                        },
                        description: 'Semantic filters for rename'
                    },
                    returnLineMeta: {
                        type: 'boolean',
                        default: false,
                        description: 'Return line metadata'
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
                    },
                    semanticMinCount: {
                        type: 'number',
                        default: 3,
                        description: 'Minimum count for semantic proximity warnings'
                    }
                },
                required: ['name', 'newName']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        super.validate(params);

        const { name, newName } = params;

        if (!name || name.trim() === '') {
            throw new Error('name cannot be empty');
        }

        if (!newName || newName.trim() === '') {
            throw new Error('newName cannot be empty');
        }

        if (name === newName) {
            throw new Error('newName must be different from current name');
        }
    }

    async execute(params) {
        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('script_refactor_rename', params);

        return result;
    }
}
