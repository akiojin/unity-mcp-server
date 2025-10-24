/**
 * Tool definition for scene_create
 */
export const createSceneToolDefinition = {
    name: 'scene_create',
    description: 'Create a new scene in Unity',
    inputSchema: {
        type: 'object',
        properties: {
            sceneName: {
                type: 'string',
                description: 'Name of the scene to create'
            },
            path: {
                type: 'string',
                description: 'Path where the scene should be saved (e.g., "Assets/Scenes/"). If not specified, defaults to "Assets/Scenes/"'
            },
            loadScene: {
                type: 'boolean',
                description: 'Whether to load the scene after creation (default: true)'
            },
            addToBuildSettings: {
                type: 'boolean',
                description: 'Whether to add the scene to build settings (default: false)'
            }
        },
        required: ['sceneName']
    }
};

/**
 * Handler for create_scene tool
 */
export async function createSceneHandler(unityConnection, args) {
    try {
        // Check connection
        if (!unityConnection.isConnected()) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to create scene: Unity connection not available'
                    }
                ],
                isError: true
            };
        }

        // Validate scene name
        if (!args.sceneName || args.sceneName.trim() === '') {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to create scene: Scene name cannot be empty'
                    }
                ],
                isError: true
            };
        }

        // Check for invalid characters in scene name
        if (args.sceneName.includes('/') || args.sceneName.includes('\\')) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to create scene: Scene name contains invalid characters'
                    }
                ],
                isError: true
            };
        }

        // Send command to Unity
        const result = await unityConnection.sendCommand('scene_create', args);

        // Handle Unity response
        if (result.status === 'error') {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to create scene: ${result.error}`
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
                    text: result.result.summary || `Scene created successfully`
                }
            ],
            isError: false
        };
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to create scene: ${error.message}`
                }
            ],
            isError: true
        };
    }
}