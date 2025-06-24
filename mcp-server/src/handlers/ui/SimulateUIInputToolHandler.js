import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class SimulateUIInputToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'simulate_ui_input',
            'Simulate complex UI interactions and input sequences',
            {
                type: 'object',
                properties: {
                    inputSequence: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    description: 'Action type (click, setvalue)'
                                },
                                params: {
                                    type: 'object',
                                    description: 'Parameters for the action'
                                }
                            },
                            required: ['type', 'params']
                        },
                        description: 'Array of input actions to perform'
                    },
                    waitBetween: {
                        type: 'number',
                        default: 100,
                        minimum: 0,
                        maximum: 10000,
                        description: 'Delay between actions in milliseconds'
                    },
                    validateState: {
                        type: 'boolean',
                        default: true,
                        description: 'Validate UI state between actions'
                    }
                },
                required: ['inputSequence']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        // Call parent validation for required fields
        super.validate(params);

        // Validate inputSequence is array
        if (!Array.isArray(params.inputSequence)) {
            throw new Error('inputSequence must be an array');
        }

        // Validate inputSequence is not empty
        if (params.inputSequence.length === 0) {
            throw new Error('inputSequence must contain at least one action');
        }

        // Validate each action
        for (const action of params.inputSequence) {
            if (!action.type || !action.params) {
                throw new Error('Each action must have type and params');
            }
        }

        // Validate waitBetween range
        if (params.waitBetween !== undefined) {
            const wait = params.waitBetween;
            if (typeof wait !== 'number' || wait < 0 || wait > 10000) {
                throw new Error('waitBetween must be between 0 and 10000 milliseconds');
            }
        }
    }

    async execute(params) {
        const {
            inputSequence,
            waitBetween = 100,
            validateState = true
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('simulate_ui_input', {
            inputSequence,
            waitBetween,
            validateState
        });

        return result;
    }
}