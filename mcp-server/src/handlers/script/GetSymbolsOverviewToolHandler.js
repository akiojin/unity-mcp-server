import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptGetSymbolsOverviewToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_symbols_get',
            'List symbols (classes, methods, fields, properties) defined in a C# file with spans.',
            {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Relative Unity project path to a .cs file (e.g., Assets/Scripts/Foo.cs).'
                    }
                },
                required: ['path']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        super.validate(params);

        const { path } = params;

        if (!path || path.trim() === '') {
            throw new Error('path cannot be empty');
        }

        // Check for .cs extension
        if (!path.endsWith('.cs')) {
            throw new Error('Only .cs files are supported');
        }
    }

    async execute(params) {
        const { path } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('script_symbols_get', {
            path
        });

        return result;
    }
}
