import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for the input_touch_simulate tool
 */
export class InputTouchSimulateToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'input_touch_simulate',
            'Simulate touch input (tap/swipe/pinch/multi) with coordinates and timing.',
            {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['tap', 'swipe', 'pinch', 'multi'],
                        description: 'The touch action to perform'
                    },
                    x: {
                        type: 'number',
                        description: 'X coordinate for tap action'
                    },
                    y: {
                        type: 'number',
                        description: 'Y coordinate for tap action'
                    },
                    touchId: {
                        type: 'number',
                        
                        minimum: 0,
                        maximum: 9,
                        description: 'Touch ID (0-9)'
                    },
                    startX: {
                        type: 'number',
                        description: 'Start X for swipe action'
                    },
                    startY: {
                        type: 'number',
                        description: 'Start Y for swipe action'
                    },
                    endX: {
                        type: 'number',
                        description: 'End X for swipe action'
                    },
                    endY: {
                        type: 'number',
                        description: 'End Y for swipe action'
                    },
                    duration: {
                        type: 'number',
                        
                        description: 'Swipe duration in milliseconds'
                    },
                    centerX: {
                        type: 'number',
                        description: 'Center X for pinch gesture'
                    },
                    centerY: {
                        type: 'number',
                        description: 'Center Y for pinch gesture'
                    },
                    startDistance: {
                        type: 'number',
                        
                        description: 'Start distance between fingers for pinch'
                    },
                    endDistance: {
                        type: 'number',
                        
                        description: 'End distance between fingers for pinch'
                    },
                    touches: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                phase: { 
                                    type: 'string',
                                    enum: ['began', 'moved', 'stationary', 'ended']
                                }
                            },
                            required: ['x', 'y']
                        },
                        description: 'Array of touch points for multi-touch'
                    }
                },
                required: ['action']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        const { action, x, y, startX, startY, endX, endY, touches } = params;

        if (!action) {
            throw new Error('action is required');
        }

        switch (action) {
            case 'tap':
                if (x === undefined || y === undefined) {
                    throw new Error('x and y coordinates are required for tap action');
                }
                break;
            case 'swipe':
                if (startX === undefined || startY === undefined || 
                    endX === undefined || endY === undefined) {
                    throw new Error('startX, startY, endX, and endY are required for swipe action');
                }
                break;
            case 'pinch':
                // Optional parameters with defaults
                break;
            case 'multi':
                if (!touches || !Array.isArray(touches) || touches.length === 0) {
                    throw new Error('touches array is required for multi-touch action');
                }
                if (touches.length > 10) {
                    throw new Error('Maximum 10 simultaneous touches supported');
                }
                for (const touch of touches) {
                    if (touch.x === undefined || touch.y === undefined) {
                        throw new Error('Each touch must have x and y coordinates');
                    }
                }
                break;        }
    }

    async execute(params) {
        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('simulate_touch_input', params);
        return result;
    }
}
