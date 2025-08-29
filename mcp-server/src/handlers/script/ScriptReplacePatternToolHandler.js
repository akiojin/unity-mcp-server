import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptReplacePatternToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_replace_pattern',
            'Search/replace across C# files using substring or regex with preview and safeguards.',
            {
                type: 'object',
                properties: {
                    pattern: {
                        type: 'string',
                        description: 'Pattern to search for (required).'
                    },
                    replacement: {
                        type: 'string',
                        description: 'Replacement text to apply.'
                    },
                    patternType: {
                        type: 'string',
                        enum: ['substring', 'regex'],
                        default: 'substring',
                        description: 'Matching strategy: substring (simple) or regex (advanced).'
                    },
                    flags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Regex flags (e.g., ["i","m","s","u"]). Used only for regex.'
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
                        description: 'Include glob pattern (e.g., **/*.cs).'
                    },
                    exclude: {
                        type: 'string',
                        description: 'Exclude glob pattern (e.g., **/Tests/**).'
                    },
                    preview: {
                        type: 'boolean',
                        default: true,
                        description: 'If true, returns a preview without writing files.'
                    },
                    pageSize: {
                        type: 'number',
                        description: 'Maximum files to process per batch.'
                    },
                    maxMatchesPerFile: {
                        type: 'number',
                        description: 'Cap replacements applied per file.'
                    },
                    maxFileSizeKB: {
                        type: 'number',
                        description: 'Skip files larger than this (KB).'
                    },
                    wordBoundary: {
                        type: 'boolean',
                        default: false,
                        description: 'If true, match only word-bounded occurrences.'
                    },
                    includeSemantic: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                container: { type: 'string' },
                                namespace: { type: 'string' }
                            }
                        },
                        description: 'Optional semantic filters to limit scope (container/namespace).'
                    },
                    returnLineMeta: {
                        type: 'boolean',
                        default: false,
                        description: 'Include per-line metadata in the response.'
                    },
                    proximityThreshold: {
                        type: 'number',
                        default: 3,
                        description: 'Warn if edits are within this many lines (detect overlapping edits).'
                    },
                    minClusterSize: {
                        type: 'number',
                        default: 2,
                        description: 'Warn when clustered edit count reaches this size.'
                    },
                    semanticMinCount: {
                        type: 'number',
                        default: 3,
                        description: 'Minimum occurrences to trigger semantic proximity warnings.'
                    }
                },
                required: ['pattern']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        super.validate(params);

        const { pattern } = params;

        if (!pattern || pattern === '') {
            throw new Error('pattern cannot be empty');
        }
    }

    async execute(params) {
        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('script_replace_pattern', params);

        return result;
    }
}
