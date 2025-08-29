import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptReadToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_read',
            'Read a script file from Unity project with chunked reading support',
            {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Path to the file (relative to project root, e.g., Assets/Scripts/Example.cs)'
                    },
                    startLine: {
                        type: 'number',
                        default: 1,
                        description: 'Starting line number (1-based)'
                    },
                    endLine: {
                        type: 'number',
                        description: 'Ending line number (if not specified, defaults to startLine + 199)'
                    },
                    maxBytes: {
                        type: 'number',
                        description: 'Maximum bytes to return'
                    }
                },
                required: ['path']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        super.validate(params);

        const { path, startLine, endLine } = params;

        // Validate path
        if (!path || path.trim() === '') {
            throw new Error('path cannot be empty');
        }

        // Validate line numbers if provided
        if (startLine !== undefined && startLine < 1) {
            throw new Error('startLine must be at least 1');
        }

        if (endLine !== undefined && startLine !== undefined && endLine < startLine) {
            throw new Error('endLine cannot be less than startLine');
        }
    }

    async execute(params) {
        const {
            path,
            startLine = 1,
            endLine,
            maxBytes
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('script_read', {
            path,
            startLine,
            endLine: endLine || (startLine + 199),
            maxBytes
        });

        return result;
    }
}
