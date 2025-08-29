import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class EditStructuredToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'edit_structured',
            'Perform structured edits on code symbols (insert before/after, replace body)',
            {
                type: 'object',
                properties: {
                    operation: {
                        type: 'string',
                        enum: ['insert_before', 'insert_after', 'replace_body'],
                        description: 'Type of edit operation'
                    },
                    path: {
                        type: 'string',
                        description: 'Path to the file'
                    },
                    symbolName: {
                        type: 'string',
                        description: 'Name of the symbol to edit'
                    },
                    kind: {
                        type: 'string',
                        description: 'Kind of symbol (e.g., class, method, field)'
                    },
                    newText: {
                        type: 'string',
                        description: 'New text to insert or replace'
                    },
                    preview: {
                        type: 'boolean',
                        default: true,
                        description: 'Whether to preview changes only'
                    }
                },
                required: ['operation', 'path', 'symbolName']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        super.validate(params);

        const { operation, path, symbolName } = params;

        const validOperations = ['insert_before', 'insert_after', 'replace_body'];
        if (!validOperations.includes(operation)) {
            throw new Error(`Invalid operation: ${operation}`);
        }

        if (!path || path.trim() === '') {
            throw new Error('path cannot be empty');
        }

        if (!symbolName || symbolName.trim() === '') {
            throw new Error('symbolName cannot be empty');
        }
    }

    async execute(params) {
        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('edit_structured', params);

        return result;
    }
}