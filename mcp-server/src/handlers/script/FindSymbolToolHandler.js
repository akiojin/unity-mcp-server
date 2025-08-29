import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptFindSymbolToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_symbol_find',
            'Find symbol definitions by name (class/method/field/property) across the project.',
            {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Symbol name to search (exact or fuzzy based on "exact").'
                    },
                    kind: {
                        type: 'string',
                        description: 'Optional: narrow by symbol kind (class, method, field, property).'
                    },
                    scope: {
                        type: 'string',
                        enum: ['assets', 'packages', 'embedded', 'all'],
                        default: 'assets',
                        description: 'Search scope: assets (Assets/), packages (Packages/), embedded, or all.'
                    },
                    exact: {
                        type: 'boolean',
                        default: false,
                        description: 'If true, match name exactly; otherwise allows partial matches.'
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
