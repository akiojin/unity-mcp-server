import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptFindReferencesToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_refs_find',
            'Find code references/usages of a symbol across the project with context and limits.',
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
                        default: 'assets',
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
