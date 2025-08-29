import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class SearchToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'search',
            'Search for patterns in Unity script files',
            {
                type: 'object',
                properties: {
                    pattern: {
                        type: 'string',
                        description: 'Search pattern (substring or regex)'
                    },
                    patternType: {
                        type: 'string',
                        enum: ['substring', 'regex', 'glob'],
                        default: 'substring',
                        description: 'Type of pattern matching'
                    },
                    flags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Regex flags (e.g., ["i"] for case-insensitive)'
                    },
                    scope: {
                        type: 'string',
                        enum: ['assets', 'packages', 'embedded', 'all'],
                        default: 'assets',
                        description: 'Search scope'
                    },
                    include: {
                        type: 'string',
                        default: '**/*.cs',
                        description: 'Include glob pattern'
                    },
                    exclude: {
                        type: 'string',
                        description: 'Exclude glob pattern'
                    },
                    pageSize: {
                        type: 'number',
                        description: 'Maximum results per page'
                    },
                    maxMatchesPerFile: {
                        type: 'number',
                        description: 'Maximum matches per file'
                    },
                    snippetContext: {
                        type: 'number',
                        description: 'Lines of context around matches'
                    },
                    maxBytes: {
                        type: 'number',
                        description: 'Maximum response size in bytes'
                    },
                    returnMode: {
                        type: 'string',
                        enum: ['metadata', 'snippets', 'full'],
                        description: 'Return mode for results'
                    },
                    startAfter: {
                        type: 'string',
                        description: 'Cursor for pagination'
                    },
                    maxFileSizeKB: {
                        type: 'number',
                        description: 'Maximum file size to search (in KB)'
                    },
                    codeOnly: {
                        type: 'boolean',
                        default: true,
                        description: 'Search only in code (exclude comments)'
                    },
                    container: {
                        type: 'string',
                        description: 'Semantic container filter'
                    },
                    namespace: {
                        type: 'string',
                        description: 'Semantic namespace filter'
                    },
                    identifier: {
                        type: 'string',
                        description: 'Semantic identifier filter'
                    }
                },
                required: []
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        super.validate(params);

        const { pattern, patternType } = params;

        // Pattern is required for non-glob pattern types
        if (patternType !== 'glob' && !pattern) {
            throw new Error('pattern is required for substring and regex search');
        }
    }

    async execute(params) {
        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('script_search', params);

        return result;
    }
}
