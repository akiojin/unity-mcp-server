/**
 * Tool definition for find_by_component
 */
export const findByComponentToolDefinition = {
  name: 'find_by_component',
  description: 'Find GameObjects that have a specific component type (scene/prefabs/all).',
  inputSchema: {
    type: 'object',
    properties: {
      componentType: {
        type: 'string',
        description: 'Component type to search for (e.g., "Light", "Collider", "AudioSource")'
      },
      includeInactive: {
        type: 'boolean',
        description: 'Include inactive GameObjects. Default: true'
      },
      searchScope: {
        type: 'string',
        enum: ['scene', 'prefabs', 'all'],
        description: 'Where to search: current scene, prefabs, or all. Default: "scene"'
      },
      matchExactType: {
        type: 'boolean',
        description: 'Match exact type only (not derived types). Default: true'
      }
    },
    required: ['componentType']
  }
};

/**
 * Handler for find_by_component tool
 */
export async function findByComponentHandler(unityConnection, args) {
  try {
    // Check connection
    if (!unityConnection.isConnected()) {
      return {
        content: [
          {
            type: 'text',
            text: 'Failed to find GameObjects: Unity connection not available'
          }
        ],
        isError: true
      };
    }

    // Send command to Unity
    const result = await unityConnection.sendCommand('find_by_component', args);

    // The unityConnection.sendCommand already extracts the result field
    // from the response, so we access properties directly on result
    if (!result || typeof result === 'string') {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to find GameObjects: Invalid response format`
          }
        ],
        isError: true
      };
    }

    if (result.error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to find GameObjects: ${result.error}`
          }
        ],
        isError: true
      };
    }

    const summary = result.summary || `Found ${result.totalFound ?? 0} GameObjects`;

    // Success response
    return {
      content: [
        {
          type: 'text',
          text: summary
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to find GameObjects: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
