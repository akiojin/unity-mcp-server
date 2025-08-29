import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handles gamepad input simulation
 */
export class GamepadSimulationHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'simulate_gamepad',
            'Simulate gamepad input (buttons/sticks/triggers/dpad) with value ranges.',
            {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['button', 'stick', 'trigger', 'dpad'],
                        description: 'The gamepad action to perform'
                    },
                    button: {
                        type: 'string',
                        description: 'Button name (a/cross, b/circle, x/square, y/triangle, start, select, etc.)'
                    },
                    buttonAction: {
                        type: 'string',
                        enum: ['press', 'release'],
                        default: 'press',
                        description: 'Button action (press or release)'
                    },
                    stick: {
                        type: 'string',
                        enum: ['left', 'right'],
                        default: 'left',
                        description: 'Which analog stick to control'
                    },
                    x: {
                        type: 'number',
                        minimum: -1,
                        maximum: 1,
                        description: 'Horizontal axis value for stick (-1 to 1)'
                    },
                    y: {
                        type: 'number',
                        minimum: -1,
                        maximum: 1,
                        description: 'Vertical axis value for stick (-1 to 1)'
                    },
                    trigger: {
                        type: 'string',
                        enum: ['left', 'right'],
                        default: 'left',
                        description: 'Which trigger to control'
                    },
                    value: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        description: 'Trigger pressure value (0 to 1)'
                    },
                    direction: {
                        type: 'string',
                        enum: ['up', 'down', 'left', 'right', 'none'],
                        description: 'D-pad direction'
                    }
                },
                required: ['action']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        const { action, button, x, y, value, direction } = params;

        if (!action) {
            throw new Error('action is required');
        }

        switch (action) {
            case 'button':
                if (!button) {
                    throw new Error('button is required for button action');
                }
                break;
            case 'stick':
                if (x === undefined || y === undefined) {
                    throw new Error('x and y values are required for stick action');
                }
                if (x < -1 || x > 1 || y < -1 || y > 1) {
                    throw new Error('Stick values must be between -1 and 1');
                }
                break;
            case 'trigger':
                if (value === undefined) {
                    throw new Error('value is required for trigger action');
                }
                if (value < 0 || value > 1) {
                    throw new Error('Trigger value must be between 0 and 1');
                }
                break;
            case 'dpad':
                if (!direction) {
                    throw new Error('direction is required for dpad action');
                }
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

        const result = await this.unityConnection.sendCommand('simulate_gamepad_input', params);
        return result;
    }
}
