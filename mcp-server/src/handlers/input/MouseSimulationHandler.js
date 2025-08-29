import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handles mouse input simulation
 */
export class MouseSimulationHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'simulate_mouse',
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
                        default: true,
                        description: 'Whether coordinates are absolute or relative'
                    },
                    button: {
                        type: 'string',
                        enum: ['left', 'right', 'middle'],
                        default: 'left',
                        description: 'Mouse button for click/drag actions'
                    },
                    clickCount: {
                        type: 'number',
                        default: 1,
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
                        default: 0,
                        description: 'Horizontal scroll delta'
                    },
                    deltaY: {
                        type: 'number',
                        default: 0,
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
                break;
            default:
                throw new Error(`Invalid action: ${action}`);
        }
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
