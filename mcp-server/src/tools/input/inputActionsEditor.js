// Tool definitions for Input Actions editing

// Action Map Management
export const createActionMapToolDefinition = {
    name: 'create_action_map',
    description: 'Create a new Action Map in an Input Actions asset',
    inputSchema: {
        type: 'object',
        properties: {
            assetPath: {
                type: 'string',
                description: 'Path to the Input Actions asset file'
            },
            mapName: {
                type: 'string',
                description: 'Name for the new Action Map'
            },
            actions: {
                type: 'array',
                description: 'Optional array of actions to add',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        type: { type: 'string', enum: ['Button', 'Value', 'PassThrough'] }
                    }
                }
            }
        },
        required: ['assetPath', 'mapName']
    }
};

export const removeActionMapToolDefinition = {
    name: 'remove_action_map',
    description: 'Remove an Action Map from an Input Actions asset',
    inputSchema: {
        type: 'object',
        properties: {
            assetPath: {
                type: 'string',
                description: 'Path to the Input Actions asset file'
            },
            mapName: {
                type: 'string',
                description: 'Name of the Action Map to remove'
            }
        },
        required: ['assetPath', 'mapName']
    }
};

// Action Management
export const addInputActionToolDefinition = {
    name: 'add_input_action',
    description: 'Add a new Action to an Action Map',
    inputSchema: {
        type: 'object',
        properties: {
            assetPath: {
                type: 'string',
                description: 'Path to the Input Actions asset file'
            },
            mapName: {
                type: 'string',
                description: 'Name of the Action Map'
            },
            actionName: {
                type: 'string',
                description: 'Name for the new Action'
            },
            actionType: {
                type: 'string',
                description: 'Type of the action',
                enum: ['Button', 'Value', 'PassThrough'],
                default: 'Button'
            }
        },
        required: ['assetPath', 'mapName', 'actionName']
    }
};

export const removeInputActionToolDefinition = {
    name: 'remove_input_action',
    description: 'Remove an Action from an Action Map',
    inputSchema: {
        type: 'object',
        properties: {
            assetPath: {
                type: 'string',
                description: 'Path to the Input Actions asset file'
            },
            mapName: {
                type: 'string',
                description: 'Name of the Action Map'
            },
            actionName: {
                type: 'string',
                description: 'Name of the Action to remove'
            }
        },
        required: ['assetPath', 'mapName', 'actionName']
    }
};

// Binding Management
export const addInputBindingToolDefinition = {
    name: 'add_input_binding',
    description: 'Add a new Binding to an Action',
    inputSchema: {
        type: 'object',
        properties: {
            assetPath: {
                type: 'string',
                description: 'Path to the Input Actions asset file'
            },
            mapName: {
                type: 'string',
                description: 'Name of the Action Map'
            },
            actionName: {
                type: 'string',
                description: 'Name of the Action'
            },
            path: {
                type: 'string',
                description: 'Binding path (e.g., "<Keyboard>/space", "<Gamepad>/buttonSouth")'
            },
            groups: {
                type: 'string',
                description: 'Control scheme groups (e.g., "Keyboard&Mouse")'
            },
            interactions: {
                type: 'string',
                description: 'Interactions (e.g., "press", "hold")'
            },
            processors: {
                type: 'string',
                description: 'Processors (e.g., "scale", "invert")'
            }
        },
        required: ['assetPath', 'mapName', 'actionName', 'path']
    }
};

export const removeInputBindingToolDefinition = {
    name: 'remove_input_binding',
    description: 'Remove a Binding from an Action',
    inputSchema: {
        type: 'object',
        properties: {
            assetPath: {
                type: 'string',
                description: 'Path to the Input Actions asset file'
            },
            mapName: {
                type: 'string',
                description: 'Name of the Action Map'
            },
            actionName: {
                type: 'string',
                description: 'Name of the Action'
            },
            bindingIndex: {
                type: 'number',
                description: 'Index of the binding to remove'
            },
            bindingPath: {
                type: 'string',
                description: 'Path of the binding to remove (alternative to bindingIndex)'
            }
        },
        required: ['assetPath', 'mapName', 'actionName']
    }
};

export const removeAllBindingsToolDefinition = {
    name: 'remove_all_bindings',
    description: 'Remove all Bindings from an Action',
    inputSchema: {
        type: 'object',
        properties: {
            assetPath: {
                type: 'string',
                description: 'Path to the Input Actions asset file'
            },
            mapName: {
                type: 'string',
                description: 'Name of the Action Map'
            },
            actionName: {
                type: 'string',
                description: 'Name of the Action'
            }
        },
        required: ['assetPath', 'mapName', 'actionName']
    }
};

export const createCompositeBindingToolDefinition = {
    name: 'create_composite_binding',
    description: 'Create a composite binding (e.g., 2D Vector for WASD movement)',
    inputSchema: {
        type: 'object',
        properties: {
            assetPath: {
                type: 'string',
                description: 'Path to the Input Actions asset file'
            },
            mapName: {
                type: 'string',
                description: 'Name of the Action Map'
            },
            actionName: {
                type: 'string',
                description: 'Name of the Action'
            },
            compositeType: {
                type: 'string',
                description: 'Type of composite',
                enum: ['2DVector', '1DAxis'],
                default: '2DVector'
            },
            name: {
                type: 'string',
                description: 'Name for the composite binding'
            },
            bindings: {
                type: 'object',
                description: 'Binding paths for composite parts',
                properties: {
                    up: { type: 'string' },
                    down: { type: 'string' },
                    left: { type: 'string' },
                    right: { type: 'string' },
                    negative: { type: 'string' },
                    positive: { type: 'string' }
                }
            },
            groups: {
                type: 'string',
                description: 'Control scheme groups'
            }
        },
        required: ['assetPath', 'mapName', 'actionName', 'bindings']
    }
};

// Control Scheme Management
export const manageControlSchemesToolDefinition = {
    name: 'manage_control_schemes',
    description: 'Manage Control Schemes in an Input Actions asset',
    inputSchema: {
        type: 'object',
        properties: {
            assetPath: {
                type: 'string',
                description: 'Path to the Input Actions asset file'
            },
            operation: {
                type: 'string',
                description: 'Operation to perform',
                enum: ['add', 'remove', 'modify']
            },
            schemeName: {
                type: 'string',
                description: 'Name of the control scheme'
            },
            devices: {
                type: 'array',
                description: 'List of device types (e.g., ["Keyboard", "Mouse", "Gamepad"])',
                items: { type: 'string' }
            }
        },
        required: ['assetPath', 'operation']
    }
};

// Helper function to format Unity response
function formatUnityResponse(result, successMessage) {
    if (!result || typeof result === 'string') {
        return {
            content: [{
                type: 'text',
                text: `Failed: Invalid response format`
            }],
            isError: true
        };
    }

    if (result.error) {
        return {
            content: [{
                type: 'text',
                text: `Failed: ${result.error}`
            }],
            isError: true
        };
    }

    if (result.success) {
        let text = result.message || successMessage;
        // Add any additional info from result
        Object.keys(result).forEach(key => {
            if (key !== 'success' && key !== 'message' && key !== 'error') {
                text += `\n${key}: ${result[key]}`;
            }
        });
        
        return {
            content: [{
                type: 'text',
                text: text
            }],
            isError: false
        };
    }

    return {
        content: [{
            type: 'text',
            text: 'Operation completed'
        }],
        isError: false
    };
}

// Handlers for Action Map Management
export async function createActionMapHandler(unityConnection, args) {
    try {
        if (!unityConnection.isConnected()) {
            return {
                content: [{
                    type: 'text',
                    text: 'Failed to create Action Map: Unity connection not available'
                }],
                isError: true
            };
        }

        const result = await unityConnection.sendCommand('create_action_map', args);
        return formatUnityResponse(result, `Created Action Map: ${args.mapName}`);
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Failed to create Action Map: ${error.message}`
            }],
            isError: true
        };
    }
}

export async function removeActionMapHandler(unityConnection, args) {
    try {
        if (!unityConnection.isConnected()) {
            return {
                content: [{
                    type: 'text',
                    text: 'Failed to remove Action Map: Unity connection not available'
                }],
                isError: true
            };
        }

        const result = await unityConnection.sendCommand('remove_action_map', args);
        return formatUnityResponse(result, `Removed Action Map: ${args.mapName}`);
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Failed to remove Action Map: ${error.message}`
            }],
            isError: true
        };
    }
}

// Handlers for Action Management
export async function addInputActionHandler(unityConnection, args) {
    try {
        if (!unityConnection.isConnected()) {
            return {
                content: [{
                    type: 'text',
                    text: 'Failed to add Input Action: Unity connection not available'
                }],
                isError: true
            };
        }

        const result = await unityConnection.sendCommand('add_input_action', args);
        return formatUnityResponse(result, `Added Action: ${args.actionName}`);
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Failed to add Input Action: ${error.message}`
            }],
            isError: true
        };
    }
}

export async function removeInputActionHandler(unityConnection, args) {
    try {
        if (!unityConnection.isConnected()) {
            return {
                content: [{
                    type: 'text',
                    text: 'Failed to remove Input Action: Unity connection not available'
                }],
                isError: true
            };
        }

        const result = await unityConnection.sendCommand('remove_input_action', args);
        return formatUnityResponse(result, `Removed Action: ${args.actionName}`);
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Failed to remove Input Action: ${error.message}`
            }],
            isError: true
        };
    }
}

// Handlers for Binding Management
export async function addInputBindingHandler(unityConnection, args) {
    try {
        if (!unityConnection.isConnected()) {
            return {
                content: [{
                    type: 'text',
                    text: 'Failed to add Input Binding: Unity connection not available'
                }],
                isError: true
            };
        }

        const result = await unityConnection.sendCommand('add_input_binding', args);
        return formatUnityResponse(result, `Added Binding: ${args.path}`);
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Failed to add Input Binding: ${error.message}`
            }],
            isError: true
        };
    }
}

export async function removeInputBindingHandler(unityConnection, args) {
    try {
        if (!unityConnection.isConnected()) {
            return {
                content: [{
                    type: 'text',
                    text: 'Failed to remove Input Binding: Unity connection not available'
                }],
                isError: true
            };
        }

        const result = await unityConnection.sendCommand('remove_input_binding', args);
        return formatUnityResponse(result, 'Removed Binding');
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Failed to remove Input Binding: ${error.message}`
            }],
            isError: true
        };
    }
}

export async function removeAllBindingsHandler(unityConnection, args) {
    try {
        if (!unityConnection.isConnected()) {
            return {
                content: [{
                    type: 'text',
                    text: 'Failed to remove all bindings: Unity connection not available'
                }],
                isError: true
            };
        }

        const result = await unityConnection.sendCommand('remove_all_bindings', args);
        return formatUnityResponse(result, `Removed all bindings from ${args.actionName}`);
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Failed to remove all bindings: ${error.message}`
            }],
            isError: true
        };
    }
}

export async function createCompositeBindingHandler(unityConnection, args) {
    try {
        if (!unityConnection.isConnected()) {
            return {
                content: [{
                    type: 'text',
                    text: 'Failed to create composite binding: Unity connection not available'
                }],
                isError: true
            };
        }

        const result = await unityConnection.sendCommand('create_composite_binding', args);
        return formatUnityResponse(result, `Created composite binding: ${args.name || args.compositeType}`);
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Failed to create composite binding: ${error.message}`
            }],
            isError: true
        };
    }
}

// Handler for Control Scheme Management
export async function manageControlSchemesHandler(unityConnection, args) {
    try {
        if (!unityConnection.isConnected()) {
            return {
                content: [{
                    type: 'text',
                    text: 'Failed to manage control schemes: Unity connection not available'
                }],
                isError: true
            };
        }

        const result = await unityConnection.sendCommand('manage_control_schemes', args);
        const operationText = args.operation === 'add' ? 'Added' : args.operation === 'remove' ? 'Removed' : 'Modified';
        return formatUnityResponse(result, `${operationText} control scheme: ${args.schemeName}`);
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Failed to manage control schemes: ${error.message}`
            }],
            isError: true
        };
    }
}