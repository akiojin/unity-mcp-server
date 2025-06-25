import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class SimulateUIInputToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'simulate_ui_input',
            'Simulate complex UI interactions and input sequences',
            {
                type: 'object',
                properties: {
                    // Option 1: Simple single input
                    elementPath: {
                        type: 'string',
                        description: 'Target UI element path (for simple input)'
                    },
                    inputType: {
                        type: 'string',
                        enum: ['click', 'doubleclick', 'rightclick', 'hover', 'focus', 'type'],
                        description: 'Type of input to simulate (for simple input)'
                    },
                    inputData: {
                        type: 'string',
                        description: 'Data for input (e.g., text to type)'
                    },
                    // Option 2: Complex sequence
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
                        description: 'Array of input actions to perform (for complex input)'
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
                }
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        // Check if using simple mode or complex mode
        const hasSimpleParams = params.elementPath && params.inputType;
        const hasComplexParams = params.inputSequence;

        if (!hasSimpleParams && !hasComplexParams) {
            throw new Error('Either (elementPath + inputType) or inputSequence is required');
        }

        if (hasSimpleParams && hasComplexParams) {
            throw new Error('Cannot use both simple and complex input modes simultaneously');
        }

        // Validate simple mode
        if (hasSimpleParams) {
            if (!params.elementPath || typeof params.elementPath !== 'string') {
                throw new Error('elementPath must be a non-empty string');
            }

            const validInputTypes = ['click', 'doubleclick', 'rightclick', 'hover', 'focus', 'type'];
            if (!validInputTypes.includes(params.inputType)) {
                throw new Error(`inputType must be one of: ${validInputTypes.join(', ')}`);
            }

            if (params.inputType === 'type' && !params.inputData) {
                throw new Error('inputData is required when inputType is "type"');
            }
        }

        // Validate complex mode
        if (hasComplexParams) {
            if (!Array.isArray(params.inputSequence)) {
                throw new Error('inputSequence must be an array');
            }

            if (params.inputSequence.length === 0) {
                throw new Error('inputSequence must contain at least one action');
            }

            // Validate each action
            for (const action of params.inputSequence) {
                if (!action.type || !action.params) {
                    throw new Error('Each action must have type and params');
                }
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
            elementPath,
            inputType,
            inputData,
            inputSequence,
            waitBetween = 100,
            validateState = true
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        let actualInputSequence;

        // Handle simple mode - convert to sequence format
        if (elementPath && inputType) {
            actualInputSequence = [{
                type: inputType,
                params: {
                    elementPath,
                    inputData: inputData || null
                }
            }];
        } else {
            // Use provided sequence
            actualInputSequence = inputSequence;
        }

        const result = await this.unityConnection.sendCommand('simulate_ui_input', {
            inputSequence: actualInputSequence,
            waitBetween,
            validateState
        });

        return result;
    }
}