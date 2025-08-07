/**
 * Tool definition for get_component_values
 */
export const getComponentValuesToolDefinition = {
    name: 'get_component_values',
    description: 'Get all properties and values of a specific component (works in both scene and prefab mode)',
    inputSchema: {
        type: 'object',
        properties: {
            gameObjectName: {
                type: 'string',
                description: 'Name of the GameObject'
            },
            componentType: {
                type: 'string',
                description: 'Type of component (e.g., "Light", "Camera", "Rigidbody")'
            },
            componentIndex: {
                type: 'number',
                description: 'Index if multiple components of same type. Default: 0'
            },
            includePrivateFields: {
                type: 'boolean',
                description: 'Include non-public fields. Default: false'
            },
            includeInherited: {
                type: 'boolean',
                description: 'Include inherited properties. Default: true'
            }
        },
        required: ['gameObjectName', 'componentType']
    }
};

/**
 * Handler for get_component_values tool
 */
export async function getComponentValuesHandler(unityConnection, args) {
    try {
        // Check connection
        if (!unityConnection.isConnected()) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to get component values: Unity connection not available'
                    }
                ],
                isError: true
            };
        }

        // Validate required parameters
        if (!args.componentType) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to get component values: componentType is required'
                    }
                ],
                isError: true
            };
        }

        // Validate componentIndex if provided
        if (args.componentIndex !== undefined && args.componentIndex < 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to get component values: componentIndex must be non-negative'
                    }
                ],
                isError: true
            };
        }

        // Send command to Unity
        const result = await unityConnection.sendCommand('get_component_values', args);

        // The unityConnection.sendCommand already extracts the result field
        // from the response, so we access properties directly on result
        if (!result || typeof result === 'string') {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to get component values: Invalid response format`
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
                        text: `Failed to get component values: ${result.error}`
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
                    text: result.summary || `Component values retrieved`
                }
            ],
            isError: false
        };
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to get component values: ${error.message}`
                }
            ],
            isError: true
        };
    }
}