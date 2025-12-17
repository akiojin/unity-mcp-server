// Tool definitions for Input Actions analysis
export const getInputActionsStateToolDefinition = {
  name: 'get_input_actions_state',
  description: 'Get Input Actions state: maps, actions, bindings, devices, JSON structure.',
  inputSchema: {
    type: 'object',
    properties: {
      assetName: {
        type: 'string',
        description: 'Name of the Input Actions asset'
      },
      assetPath: {
        type: 'string',
        description: 'Path to the Input Actions asset file'
      },
      includeBindings: {
        type: 'boolean',
        description: 'Include binding information. Default: true',
        default: true
      },
      includeControlSchemes: {
        type: 'boolean',
        description: 'Include control schemes information. Default: true',
        default: true
      },
      includeJsonStructure: {
        type: 'boolean',
        description: 'Include raw JSON structure. Default: false',
        default: false
      }
    },
    required: []
  }
};

export const analyzeInputActionsAssetToolDefinition = {
  name: 'analyze_input_actions_asset',
  description: 'Analyze an Input Actions asset in detail (statistics + device usage).',
  inputSchema: {
    type: 'object',
    properties: {
      assetPath: {
        type: 'string',
        description: 'Path to the Input Actions asset file'
      },
      includeJsonStructure: {
        type: 'boolean',
        description: 'Include raw JSON structure. Default: true',
        default: true
      },
      includeStatistics: {
        type: 'boolean',
        description: 'Include usage statistics. Default: true',
        default: true
      }
    },
    required: ['assetPath']
  }
};

// Handler for get_input_actions_state
export async function getInputActionsStateHandler(unityConnection, args) {
  try {
    // Check connection
    if (!unityConnection.isConnected()) {
      return {
        content: [
          {
            type: 'text',
            text: 'Failed to get Input Actions state: Unity connection not available'
          }
        ],
        isError: true
      };
    }

    // Send command to Unity
    const result = await unityConnection.sendCommand('get_input_actions_state', args);

    // Check for errors
    if (!result || typeof result === 'string') {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get Input Actions state: Invalid response format`
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
            text: `Failed to get Input Actions state: ${result.error}`
          }
        ],
        isError: true
      };
    }

    // Format the response
    let text = `Input Actions Asset: ${result.assetName}`;
    text += `\nPath: ${result.assetPath}`;

    if (result.actionMaps && Array.isArray(result.actionMaps)) {
      text += `\n\n## Action Maps (${result.actionMaps.length}):`;

      result.actionMaps.forEach(map => {
        text += `\n\n### ${map.name}`;
        text += `\n- ID: ${map.id}`;

        if (map.actions && Array.isArray(map.actions)) {
          text += `\n- Actions (${map.actions.length}):`;
          map.actions.forEach(action => {
            text += `\n  • ${action.name} (${action.type})`;
            if (action.expectedControlType) {
              text += ` - Expected: ${action.expectedControlType}`;
            }

            if (action.bindings && Array.isArray(action.bindings)) {
              text += `\n    Bindings (${action.bindings.length}):`;
              action.bindings.forEach(binding => {
                if (binding.isComposite) {
                  text += `\n    - Composite: ${binding.name || 'Unnamed'}`;
                } else if (binding.isPartOfComposite) {
                  text += `\n      • ${binding.path}`;
                } else {
                  text += `\n    - ${binding.path}`;
                }
                if (binding.groups) {
                  text += ` [${binding.groups}]`;
                }
              });
            }
          });
        }
      });
    }

    if (result.controlSchemes && Array.isArray(result.controlSchemes)) {
      text += `\n\n## Control Schemes (${result.controlSchemes.length}):`;
      result.controlSchemes.forEach(scheme => {
        text += `\n- ${scheme.name}`;
        if (scheme.bindingGroup) {
          text += ` (Group: ${scheme.bindingGroup})`;
        }
        if (scheme.devices && Array.isArray(scheme.devices)) {
          text += `\n  Devices:`;
          scheme.devices.forEach(device => {
            text += `\n  • ${device.controlPath}`;
            if (device.isOptional) {
              text += ' (optional)';
            }
          });
        }
      });
    }

    if (result.jsonStructure) {
      text += `\n\n## JSON Structure:\n\`\`\`json\n${JSON.stringify(result.jsonStructure, null, 2)}\n\`\`\``;
    }

    return {
      content: [
        {
          type: 'text',
          text: text
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to get Input Actions state: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

// Handler for analyze_input_actions_asset
export async function analyzeInputActionsAssetHandler(unityConnection, args) {
  try {
    // Check connection
    if (!unityConnection.isConnected()) {
      return {
        content: [
          {
            type: 'text',
            text: 'Failed to analyze Input Actions asset: Unity connection not available'
          }
        ],
        isError: true
      };
    }

    // Validate required parameters
    if (!args.assetPath) {
      return {
        content: [
          {
            type: 'text',
            text: 'Failed to analyze Input Actions asset: assetPath is required'
          }
        ],
        isError: true
      };
    }

    // Send command to Unity
    const result = await unityConnection.sendCommand('analyze_input_actions_asset', args);

    // Check for errors
    if (!result || typeof result === 'string') {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to analyze Input Actions asset: Invalid response format`
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
            text: `Failed to analyze Input Actions asset: ${result.error}`
          }
        ],
        isError: true
      };
    }

    // Format the response
    let text = `# Input Actions Analysis: ${result.assetName}`;
    text += `\n\nPath: ${result.assetPath}`;
    text += `\nAction Maps: ${result.actionMapCount}`;

    if (result.statistics) {
      text += `\n\n## Statistics:`;
      text += `\n- Total Actions: ${result.statistics.totalActions}`;
      text += `\n- Total Bindings: ${result.statistics.totalBindings}`;
      text += `\n- Total Control Schemes: ${result.statistics.totalControlSchemes}`;

      if (result.statistics.devicesUsed && Array.isArray(result.statistics.devicesUsed)) {
        text += `\n- Devices Used: ${result.statistics.devicesUsed.join(', ')}`;
      }
    }

    if (result.actionMaps && Array.isArray(result.actionMaps)) {
      text += `\n\n## Detailed Action Maps:`;

      result.actionMaps.forEach(map => {
        text += `\n\n### ${map.name}`;
        text += `\n- Actions: ${map.actionCount}`;
        text += `\n- Bindings: ${map.bindingCount}`;

        if (map.actions && Array.isArray(map.actions)) {
          text += `\n\n#### Actions:`;
          map.actions.forEach(action => {
            text += `\n\n**${action.name}** (${action.type})`;
            text += `\n- ID: ${action.id}`;
            text += `\n- Expected Control: ${action.expectedControlType || 'Any'}`;
            text += `\n- Bindings: ${action.bindingCount}`;

            if (action.bindings && Array.isArray(action.bindings)) {
              text += `\n\n  Bindings:`;
              action.bindings.forEach((binding, index) => {
                if (binding.isComposite) {
                  text += `\n  ${index + 1}. **Composite**: ${binding.name || 'Unnamed'}`;
                } else if (binding.isPartOfComposite) {
                  text += `\n     - ${binding.name}: ${binding.path}`;
                } else {
                  text += `\n  ${index + 1}. ${binding.path}`;
                }

                if (binding.groups) {
                  text += ` [${binding.groups}]`;
                }
                if (binding.interactions) {
                  text += `\n     Interactions: ${binding.interactions}`;
                }
                if (binding.processors) {
                  text += `\n     Processors: ${binding.processors}`;
                }
              });
            }
          });
        }
      });
    }

    if (result.jsonStructure) {
      text += `\n\n## Raw JSON Structure:\n\`\`\`json\n${JSON.stringify(result.jsonStructure, null, 2)}\n\`\`\``;
    }

    return {
      content: [
        {
          type: 'text',
          text: text
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to analyze Input Actions asset: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
