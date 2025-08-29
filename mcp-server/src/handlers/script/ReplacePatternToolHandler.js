import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptReplacePatternToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_replace_pattern',
            'Replace patterns in Unity script files using regex or substring matching',
            {
                type: 'object',
                properties: {
                    pattern: {
                        type: 'string',
                        description: 'Pattern to search for'
                    },
                    replacement: {
                        type: 'string',
                        description: 'Replacement text'
                    },
                    patternType: {
                        type: 'string',
                        enum: ['substring', 'regex'],
                        default: 'substring',
                        description: 'Type of pattern matching'
                    },
                    flags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Regex flags'
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
                    preview: {
                        type: 'boolean',
                        default: true,
                        description: 'Whether to preview changes only'
                    },
                    pageSize: {
                        type: 'number',
                        description: 'Maximum files to process'
                    },
                    maxMatchesPerFile: {
                        type: 'number',
                        description: 'Maximum replacements per file'
                    },
                    maxFileSizeKB: {
                        type: 'number',
                        description: 'Maximum file size to process (in KB)'
                    },
                    wordBoundary: {
                        type: 'boolean',
                        default: false,
                        description: 'Match word boundaries only'
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
                        description: 'Semantic filters for replacements'
                    },
                    returnLineMeta: {
                        type: 'boolean',
                        default: false,
                        description: 'Return line metadata'
                    },
                    proximityThreshold: {
                        type: 'number',
                        default: 3,
                        description: 'Lines threshold for proximity warnings'
                    },
                    minClusterSize: {
                        type: 'number',
                        default: 2,
                        description: 'Minimum cluster size for proximity warnings'
                    },
                    semanticMinCount: {
                        type: 'number',
                        default: 3,
                        description: 'Minimum count for semantic proximity warnings'
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
