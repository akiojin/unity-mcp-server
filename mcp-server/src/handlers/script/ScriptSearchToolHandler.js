import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptSearchToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_search',
            'Search C# code by substring/regex/glob with scope, globs, pagination, and snippet context.',
            {
                type: 'object',
                properties: {
                    pattern: {
                        type: 'string',
                        description: 'Pattern to search (required unless patternType="glob"). For glob mode, use include/exclude.'
                    },
                    patternType: {
                        type: 'string',
                        enum: ['substring', 'regex', 'glob'],
                        default: 'substring',
                        description: 'Pattern matching strategy: substring, regex, or glob-only scan.'
                    },
                    flags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Regex flags (e.g., ["i","m","s","u"]). Ignored for substring/glob.'
                    },
                    scope: {
                        type: 'string',
                        enum: ['assets', 'packages', 'embedded', 'all'],
                        default: 'assets',
                        description: 'Search scope: assets (Assets/), packages (Packages/), embedded, or all.'
                    },
                    include: {
                        type: 'string',
                        default: '**/*.cs',
                        description: 'Include glob pattern (e.g., **/*.cs). Used in all modes.'
                    },
                    exclude: {
                        type: 'string',
                        description: 'Exclude glob pattern (e.g., **/Tests/**).'
                    },
                    pageSize: {
                        type: 'number',
                        description: 'Maximum results per page for pagination.'
                    },
                    maxMatchesPerFile: {
                        type: 'number',
                        description: 'Cap matches returned per file.'
                    },
                    snippetContext: {
                        type: 'number',
                        description: 'Number of context lines around each match.'
                    },
                    maxBytes: {
                        type: 'number',
                        description: 'Maximum response size (bytes) to keep outputs LLM‑friendly.'
                    },
                    returnMode: {
                        type: 'string',
                        enum: ['metadata', 'snippets', 'full'],
                        description: 'Result detail: metadata (fast), snippets (recommended), or full.'
                    },
                    startAfter: {
                        type: 'string',
                        description: 'Opaque cursor for pagination (use value from previous page).'
                    },
                    maxFileSizeKB: {
                        type: 'number',
                        description: 'Skip files larger than this (KB).'
                    },
                    codeOnly: {
                        type: 'boolean',
                        default: true,
                        description: 'If true, exclude comments/whitespace to reduce noise.'
                    },
                    container: {
                        type: 'string',
                        description: 'Semantic filter: container (e.g., class name).'
                    },
                    namespace: {
                        type: 'string',
                        description: 'Semantic filter: namespace.'
                    },
                    identifier: {
                        type: 'string',
                        description: 'Semantic filter: identifier (e.g., method or field name).'
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
