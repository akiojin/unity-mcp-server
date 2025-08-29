import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptFindReferencesToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_refs_find',
            'Find references to a symbol across the codebase',
            {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Name of the symbol to find references for'
                    },
                    scope: {
                        type: 'string',
                        enum: ['assets', 'packages', 'embedded', 'all'],
                        default: 'assets',
                        description: 'Search scope'
                    },
                    snippetContext: {
                        type: 'number',
                        description: 'Lines of context around references'
                    },
                    maxMatchesPerFile: {
                        type: 'number',
                        description: 'Maximum references per file'
                    },
                    pageSize: {
                        type: 'number',
                        description: 'Maximum results to return'
                    },
                    maxBytes: {
                        type: 'number',
                        description: 'Maximum response size in bytes'
                    },
                    container: {
                        type: 'string',
                        description: 'Container (class) of the symbol'
                    },
                    namespace: {
                        type: 'string',
                        description: 'Namespace of the symbol'
                    },
                    path: {
                        type: 'string',
                        description: 'Path to file containing the symbol'
                    },
                    kind: {
                        type: 'string',
                        description: 'Kind of symbol'
                    }
                },
                required: ['name']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        super.validate(params);

        const { name } = params;

        if (!name || name.trim() === '') {
            throw new Error('name cannot be empty');
        }
    }

    async execute(params) {
        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('script_refs_find', params);

        return result;
    }
}
