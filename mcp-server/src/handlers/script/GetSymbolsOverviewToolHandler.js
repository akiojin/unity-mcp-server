import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class GetSymbolsOverviewToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'get_symbols_overview',
            'Get an overview of symbols (classes, methods, fields) in a script file',
            {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Path to the file (relative to project root)'
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

        const result = await this.unityConnection.sendCommand('get_symbols_overview', {
            path
        });

        return result;
    }
}