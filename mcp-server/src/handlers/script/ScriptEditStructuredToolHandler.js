import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { WriteGate } from '../../core/writeGate.js';

export class ScriptEditStructuredToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_edit_structured',
            'PRIORITY: Use this for ALL code changes. Perform structured symbol edits (insert_before/insert_after/replace_body) scoped to a known symbol. Prefer this over line-based patching. Rules: (1) Identify the target with script_symbols_get first, (2) Do NOT insert members inside methods — insert at class level only, (3) For replace_body include opening/closing braces and make the body self‑contained (returns, try/catch/finally closed). Token advice: skip preview unless the change is risky; validate by compiling.',
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
                        description: 'Project-relative C# path starting with Assets/ or Packages/ (e.g., Packages/unity-editor-mcp/Editor/Foo.cs). Do NOT prefix repository folders like UnityEditorMCP/….'
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
                        default: false,
                        description: 'If true, returns a preview without writing files. Default=false to reduce large diff payloads.'
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

        const { operation, path, symbolName, kind } = params;

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

        // Safety guard: forbid inserting members into a method scope
        if ((operation === 'insert_after' || operation === 'insert_before') && (kind || '').toLowerCase() === 'method') {
            throw new Error('Insert operations must target class/namespace, not method scope. Use kind:"class" and insert at class level.');
        }
    }

    async execute(params) {
        // Normalize path to project-relative form
        if (params?.path) {
            const raw = String(params.path).replace(/\\\\/g, '/');
            const ai = raw.indexOf('Assets/');
            const pi = raw.indexOf('Packages/');
            const i = (ai >= 0 && pi >= 0) ? Math.min(ai, pi) : (ai >= 0 ? ai : pi);
            params.path = i >= 0 ? raw.substring(i) : raw;
        }
        const preview = params?.preview === true;
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }
        return this.writeGate.sendWithGate('script_edit_structured', params, { preview });
    }
}
