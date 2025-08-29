/**
 * Tool definition for get_object_references
 */
export const getObjectReferencesToolDefinition = {
    name: 'get_object_references',
    description: 'Find references to and from a GameObject (hierarchy/assets/prefabs).',
    inputSchema: {
        type: 'object',
        properties: {
            gameObjectName: {
                type: 'string',
                description: 'Name of the GameObject to analyze references for'
            },
            includeAssetReferences: {
                type: 'boolean',
                description: 'Include references to assets (materials, meshes, etc). Default: true'
            },
            includeHierarchyReferences: {
                type: 'boolean',
                description: 'Include parent/child hierarchy references. Default: true'
            },
            searchInPrefabs: {
                type: 'boolean',
                description: 'Also search for references in prefab assets. Default: false'
            }
        },
        required: ['gameObjectName']
    }
};

/**
 * Handler for get_object_references tool
 */
export async function getObjectReferencesHandler(unityConnection, args) {
    try {
        // Check connection
        if (!unityConnection.isConnected()) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Failed to get object references: Unity connection not available'
                    }
                ],
                isError: true
            };
        }

        // Send command to Unity
        const result = await unityConnection.sendCommand('get_object_references', args);

        // Handle Unity response
        if (result.status === 'error') {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to get object references: ${result.error}`
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
                    text: result.result.summary || `References analyzed for ${args.gameObjectName}`
                }
            ],
            isError: false
        };
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to get object references: ${error.message}`
                }
            ],
            isError: true
        };
    }
}
