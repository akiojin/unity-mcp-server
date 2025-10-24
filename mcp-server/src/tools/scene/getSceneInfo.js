/**
 * Tool definition for scene_info_get
 */
export const getSceneInfoToolDefinition = {
    name: 'scene_info_get',
    description: 'Get detailed information about a scene',
    inputSchema: {
        type: 'object',
        properties: {
            scenePath: {
                type: 'string',
                description: 'Full path to the scene file. If not provided, gets info about current scene.'
            },
            sceneName: {
                type: 'string',
                description: 'Name of the scene. Use either scenePath or sceneName, not both.'
            },
            includeGameObjects: {
                type: 'boolean',
                description: 'Include list of root GameObjects in the scene (only for loaded scenes). Default: false'
            }
        },
        required: []
    }
};

/**
 * Handler for get_scene_info tool
 */
export async function getSceneInfoHandler(unityConnection, args) {
    try {
        // Check connection
        if (!unityConnection.isConnected()) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to get scene info: Unity connection not available'
                    }
                ],
                isError: true
            };
        }

        // Validate that only one identifier is provided if any
        if (args.scenePath && args.sceneName) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to get scene info: Provide either scenePath or sceneName, not both'
                    }
                ],
                isError: true
            };
        }

        // Send command to Unity
        const result = await unityConnection.sendCommand('scene_info_get', args);

        // Handle Unity response
        if (result.status === 'error') {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to get scene info: ${result.error}`
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
                    text: result.result.summary || `Scene information retrieved`
                }
            ],
            isError: false
        };
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to get scene info: ${error.message}`
                }
            ],
            isError: true
        };
    }
}