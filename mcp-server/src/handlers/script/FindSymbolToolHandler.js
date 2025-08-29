import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptFindSymbolToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_symbol_find',
            'Find symbols (classes, methods, fields) by name across the codebase',
            {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Name of the symbol to find'
                    },
                    kind: {
                        type: 'string',
                        description: 'Kind of symbol (e.g., class, method, field, property)'
                    },
                    scope: {
                        type: 'string',
                        enum: ['assets', 'packages', 'embedded', 'all'],
                        default: 'assets',
                        description: 'Search scope'
                    },
                    exact: {
                        type: 'boolean',
                        default: false,
                        description: 'Whether to match name exactly'
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
        const {
            name,
            kind,
            scope = 'assets',
            exact = false
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('script_symbol_find', {
            name,
            kind,
            scope,
            exact
        });

        return result;
    }
}
