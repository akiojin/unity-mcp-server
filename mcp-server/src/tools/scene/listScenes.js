/**
 * Tool definition for scene_list
 */
export const listScenesToolDefinition = {
    name: 'scene_list',
    description: 'List all scenes in the Unity project',
    inputSchema: {
        type: 'object',
        properties: {
            includeLoadedOnly: {
                type: 'boolean',
                description: 'Only include currently loaded scenes (default: false)'
            },
            includeBuildScenesOnly: {
                type: 'boolean',
                description: 'Only include scenes in build settings (default: false)'
            },
            includePath: {
                type: 'string',
                description: 'Filter scenes by path pattern (e.g., "Levels" to find scenes in Levels folder)'
            }
        },
        required: []
    }
};

/**
 * Handler for list_scenes tool
 */
export async function listScenesHandler(unityConnection, args) {
    try {
        // Check connection
        if (!unityConnection.isConnected()) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to list scenes: Unity connection not available'
                    }
                ],
                isError: true
            };
        }

        // Send command to Unity
        const result = await unityConnection.sendCommand('scene_list', args);

        // Handle Unity response
        if (result.status === 'error') {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to list scenes: ${result.error}`
                    }
                ],
                isError: true
            };
        }

        // Success response
        return {
            content: [
                {
                    type: 'text',
                    text: result.result.summary || `Found ${result.result.totalCount} scenes`
                }
            ],
            isError: false
        };
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to list scenes: ${error.message}`
                }
            ],
            isError: true
        };
    }
}