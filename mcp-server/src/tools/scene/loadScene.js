/**
 * Tool definition for scene_load
 */
export const loadSceneToolDefinition = {
    name: 'scene_load',
    description: 'Load a scene in Unity',
    inputSchema: {
        type: 'object',
        properties: {
            scenePath: {
                type: 'string',
                description: 'Full path to the scene file (e.g., "Assets/Scenes/MainMenu.unity")'
            },
            sceneName: {
                type: 'string',
                description: 'Name of the scene to load (must be in build settings). Use either scenePath or sceneName, not both.'
            },
            loadMode: {
                type: 'string',
                enum: ['Single', 'Additive'],
                description: 'How to load the scene. Single replaces current scene(s), Additive adds to current scene(s) (default: Single)'
            }
        },
        required: []
    }
};

/**
 * Handler for load_scene tool
 */
export async function loadSceneHandler(unityConnection, args) {
    try {
        // Check connection
        if (!unityConnection.isConnected()) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to load scene: Unity connection not available'
                    }
                ],
                isError: true
            };
        }

        // Validate that either scenePath or sceneName is provided
        if (!args.scenePath && !args.sceneName) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to load scene: Either scenePath or sceneName must be provided'
                    }
                ],
                isError: true
            };
        }

        // Validate that only one is provided
        if (args.scenePath && args.sceneName) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to load scene: Provide either scenePath or sceneName, not both'
                    }
                ],
                isError: true
            };
        }

        // Validate load mode
        if (args.loadMode && !['Single', 'Additive'].includes(args.loadMode)) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to load scene: Invalid load mode. Must be "Single" or "Additive"'
                    }
                ],
                isError: true
            };
        }

        // Send command to Unity
        const result = await unityConnection.sendCommand('scene_load', args);

        // Handle Unity response
        if (result.status === 'error') {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to load scene: ${result.error}`
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
                    text: result.result.summary || `Scene loaded successfully`
                }
            ],
            isError: false
        };
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to load scene: ${error.message}`
                }
            ],
            isError: true
        };
    }
}