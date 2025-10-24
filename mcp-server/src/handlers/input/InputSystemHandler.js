import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handles Input System operations
 */
export class InputSystemHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'input_system_control',
            'Main handler for Input System operations',
            {
                type: 'object',
                properties: {
                    operation: {
                        type: 'string',
                        enum: ['keyboard', 'mouse', 'gamepad', 'touch', 'sequence', 'get_state'],
                        description: 'The input operation to perform'
                    },
                    parameters: {
                        type: 'object',
                        description: 'Parameters for the specific operation'
                    }
                },
                required: ['operation']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        const { operation, parameters } = params;

        if (!operation) {
            throw new Error('operation is required');
        }

        const validOperations = ['keyboard', 'mouse', 'gamepad', 'touch', 'sequence', 'get_state'];
        if (!validOperations.includes(operation)) {
            throw new Error(`Invalid operation: ${operation}. Must be one of: ${validOperations.join(', ')}`);
        }

        // Operation-specific validation
        if (operation !== 'get_state' && !parameters) {
            throw new Error(`parameters are required for operation: ${operation}`);
        }
    }

    async execute(params) {
        const { operation, parameters = {} } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        let command;
        switch (operation) {
            case 'keyboard':
                command = 'simulate_keyboard_input';
                break;
            case 'mouse':
                command = 'simulate_mouse_input';
                break;
            case 'gamepad':
                command = 'simulate_gamepad_input';
                break;
            case 'touch':
                command = 'simulate_touch_input';
                break;
            case 'sequence':
                command = 'create_input_sequence';
                break;
            case 'get_state':
                command = 'get_current_input_state';
                break;        }

        const result = await this.unityConnection.sendCommand(command, parameters);
        return result;
    }
}