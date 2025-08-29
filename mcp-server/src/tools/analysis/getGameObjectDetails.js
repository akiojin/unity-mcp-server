/**
 * Tool definition for get_gameobject_details
 */
export const getGameObjectDetailsToolDefinition = {
    name: 'get_gameobject_details',
    description: 'Get details for a GameObject by name or path (children/components/materials).',
    inputSchema: {
        type: 'object',
        properties: {
            gameObjectName: {
                type: 'string',
                description: 'Name of the GameObject to inspect'
            },
            path: {
                type: 'string',
                description: 'Full hierarchy path to the GameObject (use either name or path)'
            },
            includeChildren: {
                type: 'boolean',
                description: 'Include full hierarchy details. Default: false'
            },
            includeComponents: {
                type: 'boolean',
                description: 'Include all component details. Default: true'
            },
            includeMaterials: {
                type: 'boolean',
                description: 'Include material information. Default: false'
            },
            maxDepth: {
                type: 'number',
                description: 'Maximum depth for child traversal. Default: 3, Range: 0-10'
            }
        },
        required: ['gameObjectName']
    }
};

/**
 * Handler for get_gameobject_details tool
 */
export async function getGameObjectDetailsHandler(unityConnection, args) {
    try {
        // Check connection
        if (!unityConnection.isConnected()) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to get GameObject details: Unity connection not available'
                    }
                ],
                isError: true
            };
        }

        // Validate that either gameObjectName or path is provided
        if (!args.gameObjectName && !args.path) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to get GameObject details: Either gameObjectName or path must be provided'
                    }
                ],
                isError: true
            };
        }

        // Validate that only one identifier is provided
        if (args.gameObjectName && args.path) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to get GameObject details: Provide either gameObjectName or path, not both'
                    }
                ],
                isError: true
            };
        }

        // Validate maxDepth if provided
        if (args.maxDepth !== undefined) {
            if (args.maxDepth < 0 || args.maxDepth > 10) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Failed to get GameObject details: maxDepth must be between 0 and 10'
                        }
                    ],
                    isError: true
                };
            }
        }

        // Build params only with provided values and defaults where needed
        const params = {};
        
        if (args.gameObjectName) params.gameObjectName = args.gameObjectName;
        if (args.path) params.path = args.path;
        if (args.includeChildren !== undefined) params.includeChildren = args.includeChildren;
        if (args.includeComponents !== undefined) params.includeComponents = args.includeComponents;
        if (args.includeMaterials !== undefined) params.includeMaterials = args.includeMaterials;
        if (args.maxDepth !== undefined) params.maxDepth = args.maxDepth;

        // Send command to Unity
        const result = await unityConnection.sendCommand('get_gameobject_details', args);

        // The unityConnection.sendCommand already extracts the result field
        // from the response, so we access properties directly on result
        if (!result || typeof result === 'string') {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to get GameObject details: Invalid response format`
                    }
                ],
                isError: true
            };
        }

        // Check if result has error property (error response from Unity)
        if (result.error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to get GameObject details: ${result.error}`
                    }
                ],
                isError: true
            };
        }

        // Success response - result is already the unwrapped data
        return {
            content: [
                {
                    type: 'text',
                    text: result.summary || `GameObject details retrieved`
                }
            ],
            isError: false
        };
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to get GameObject details: ${error.message}`
                }
            ],
            isError: true
        };
    }
}
