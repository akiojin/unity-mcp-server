/**
 * Tool definition for analyze_scene_contents
 */
export const analyzeSceneContentsToolDefinition = {
    name: 'analyze_scene_contents',
    description: 'Analyze current scene: object counts, types, prefabs, and memory stats.',
    inputSchema: {
        type: 'object',
        properties: {
            includeInactive: {
                type: 'boolean',
                description: 'Include inactive objects in analysis. Default: true'
            },
            groupByType: {
                type: 'boolean',
                description: 'Group results by component types. Default: true'
            },
            includePrefabInfo: {
                type: 'boolean',
                description: 'Include prefab connection info. Default: true'
            },
            includeMemoryInfo: {
                type: 'boolean',
                description: 'Include memory usage estimates. Default: false'
            }
        },
        required: []
    }
};

/**
 * Handler for analyze_scene_contents tool
 */
export async function analyzeSceneContentsHandler(unityConnection, args) {
    try {
        // Check connection
        if (!unityConnection.isConnected()) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to analyze scene: Unity connection not available'
                    }
                ],
                isError: true
            };
        }

        // Send command to Unity with provided parameters
        const result = await unityConnection.sendCommand('analyze_scene_contents', args);

        // The unityConnection.sendCommand already extracts the result field
        // from the response, so we access properties directly on result
        if (!result || typeof result === 'string') {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to analyze scene: Invalid response format`
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
                        text: `Failed to analyze scene: ${result.error}`
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
                    text: result.summary || 'Scene analysis complete'
                }
            ],
            isError: false
        };
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to analyze scene: ${error.message}`
                }
            ],
            isError: true
        };
    }
}
