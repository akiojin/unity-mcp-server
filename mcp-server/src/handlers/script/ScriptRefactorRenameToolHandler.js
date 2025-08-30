import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { WriteGate } from '../../core/writeGate.js';

export class ScriptRefactorRenameToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_refactor_rename',
            'Refactor: rename a symbol (class/method/variable/etc.) across the project with preview. BEST PRACTICES: ALWAYS use preview=true first. Check collision warnings before applying. Use includeSemantic filters for targeted renaming. Watch semanticProximityTypes warnings for concentrated changes. Set allowCollisions=true only if you understand the risks. Handles all references including method calls, field access, type usage.',
            {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Current symbol name to rename.'
                    },
                    newName: {
                        type: 'string',
                        description: 'New name for the symbol.'
                    },
                    scope: {
                        type: 'string',
                        enum: ['assets', 'packages', 'embedded', 'all'],
                        default: 'assets',
                        description: 'Search scope: assets (Assets/), packages (Packages/), embedded, or all.'
                    },
                    preview: {
                        type: 'boolean',
                        default: true,
                        description: 'If true, calculate and return changes without writing files.'
                    },
                    maxMatchesPerFile: {
                        type: 'number',
                        description: 'Cap matches processed per file.'
                    },
                    pageSize: {
                        type: 'number',
                        description: 'Maximum files to process per batch.'
                    },
                    allowCollisions: {
                        type: 'boolean',
                        default: false,
                        description: 'If true, proceed even if potential name collisions are detected.'
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
                        description: 'Optional semantic filters to limit scope (container/namespace).'
                    },
                    returnLineMeta: {
                        type: 'boolean',
                        default: false,
                        description: 'Include per-line metadata in the response.'
                    },
                    proximityThreshold: {
                        type: 'number',
                        default: 3,
                        description: 'Warn if edits are within this many lines (detect overlapping edits).'
                    },
                    minClusterSize: {
                        type: 'number',
                        default: 2,
                        description: 'Warn when clustered edit count reaches this size.'
                    },
                    semanticMinCount: {
                        type: 'number',
                        default: 3,
                        description: 'Minimum occurrences to trigger semantic proximity warnings.'
                    }
                },
                required: ['name', 'newName']
            }
        );
        this.unityConnection = unityConnection;
        this.writeGate = new WriteGate(unityConnection);
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
        const preview = params?.preview === true; // ツールによっては無いが将来用
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }
        return this.writeGate.sendWithGate('script_refactor_rename', params, { preview });
    }
}
