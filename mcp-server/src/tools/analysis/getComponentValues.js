/**
 * Tool definition for analysis_component_values_get
 */
export const getComponentValuesToolDefinition = {
  name: 'analysis_component_values_get',
  description: 'Get properties/values from a component on a GameObject (scene or prefab mode).',
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
    const result = await unityConnection.sendCommand('analysis_component_values_get', args);

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
    console.log('[DEBUG] GetComponentValues - Full result:', JSON.stringify(result, null, 2));

    let responseText = result.summary || `Component values retrieved`;

    // Add detailed property information if available
    if (result.properties && Object.keys(result.properties).length > 0) {
      console.log('[DEBUG] Properties found:', Object.keys(result.properties).length);
      responseText += '\n\nProperties:';
      for (const [key, value] of Object.entries(result.properties)) {
        if (value && typeof value === 'object') {
          if (value.error) {
            responseText += `\n- ${key}: ERROR - ${value.error}`;
          } else {
            const valueStr = value.value ? JSON.stringify(value.value, null, 2) : 'null';
            const typeStr = value.type || 'unknown';
            responseText += `\n- ${key} (${typeStr}): ${valueStr}`;

            // Add range info if available
            if (value.range) {
              responseText += ` [range: ${value.range.min}-${value.range.max}]`;
            }

            // Add tooltip if available
            if (value.tooltip) {
              responseText += ` // ${value.tooltip}`;
            }

            // Add serialization info
            if (value.serialized) {
              responseText += ` (SerializeField)`;
            }
            if (value.hiddenInInspector) {
              responseText += ` (HideInInspector)`;
            }
          }
        }
      }
    } else {
      console.log('[DEBUG] No properties found in result');
      console.log('[DEBUG] Result keys:', Object.keys(result));
    }

    // Add debug information if available
    if (result.debug) {
      responseText += '\n\nDebug Info:';
      responseText += `\n- Properties type: ${result.debug.propertiesType}`;
      responseText += `\n- Properties count: ${result.debug.propertiesCount}`;
      if (result.debug.firstPropertyKey) {
        responseText += `\n- First property key: ${result.debug.firstPropertyKey}`;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText
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
