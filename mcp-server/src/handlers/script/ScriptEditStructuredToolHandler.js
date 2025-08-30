import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { WriteGate } from '../../core/writeGate.js';

export class ScriptEditStructuredToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_edit_structured',
            'Perform structured symbol edits: insert before/after a symbol or replace its body. BEST PRACTICES: Use for safe symbol-level edits (class/method/field). Always preview=true first. Specify "kind" for better accuracy. Works with nested symbols. For insert operations, newText should include proper indentation. For replace_body, include opening/closing braces in newText.',
            {
                type: 'object',
                properties: {
                    operation: {
                        type: 'string',
                        enum: ['insert_before', 'insert_after', 'replace_body'],
                        description: 'Edit type: insert_before, insert_after, or replace_body.'
                    },
                    path: {
                        type: 'string',
                        description: 'Relative Unity project path (e.g., Assets/Scripts/Foo.cs).'
                    },
                    symbolName: {
                        type: 'string',
                        description: 'Target symbol name (e.g., class/method/field name).'
                    },
                    kind: {
                        type: 'string',
                        description: 'Symbol kind (e.g., class, method, field, property). Optional but improves precision.'
                    },
                    newText: {
                        type: 'string',
                        description: 'Text to insert or use as replacement body.'
                    },
                    preview: {
                        type: 'boolean',
                        default: true,
                        description: 'If true, returns a preview without writing files.'
                    }
                },
                required: ['operation', 'path', 'symbolName']
            }
        );
        this.unityConnection = unityConnection;
        this.writeGate = new WriteGate(unityConnection);
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
        const preview = params?.preview === true;
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }
        return this.writeGate.sendWithGate('script_edit_structured', params, { preview });
    }
}
