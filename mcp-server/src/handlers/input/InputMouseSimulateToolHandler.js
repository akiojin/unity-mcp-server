import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for the input_mouse_simulate tool
 */
export class InputMouseSimulateToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'input_mouse_simulate',
            'Simulate mouse input (move/click/drag/scroll) with absolute/relative coords.',
            {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['move', 'click', 'drag', 'scroll'],
                        description: 'The mouse action to perform'
                    },
                    x: {
                        type: 'number',
                        description: 'X coordinate for move action'
                    },
                    y: {
                        type: 'number',
                        description: 'Y coordinate for move action'
                    },
                    absolute: {
                        type: 'boolean',
                        description: 'Whether coordinates are absolute or relative (default: true)'
                    },
                    button: {
                        type: 'string',
                        enum: ['left', 'right', 'middle'],
                        description: 'Mouse button for click/drag actions'
                    },
                    clickCount: {
                        type: 'number',
                        description: 'Number of clicks (for double/triple click)'
                    },
                    startX: {
                        type: 'number',
                        description: 'Start X for drag action'
                    },
                    startY: {
                        type: 'number',
                        description: 'Start Y for drag action'
                    },
                    endX: {
                        type: 'number',
                        description: 'End X for drag action'
                    },
                    endY: {
                        type: 'number',
                        description: 'End Y for drag action'
                    },
                    deltaX: {
                        type: 'number',
                        
                        description: 'Horizontal scroll delta'
                    },
                    deltaY: {
                        type: 'number',
                        
                        description: 'Vertical scroll delta'
                    }
                },
                required: ['action']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        const { action, x, y, startX, startY, endX, endY } = params;

        if (!action) {
            throw new Error('action is required');
        }

        switch (action) {
            case 'move':
                if (x === undefined || y === undefined) {
                    throw new Error('x and y coordinates are required for move action');
                }
                break;
            case 'drag':
                if (startX === undefined || startY === undefined || 
                    endX === undefined || endY === undefined) {
                    throw new Error('startX, startY, endX, and endY are required for drag action');
                }
                break;
            case 'click':
            case 'scroll':
                // These actions have optional parameters
                break;        }
    }

    async execute(params) {
        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('simulate_mouse_input', params);
        return result;
    }
}
