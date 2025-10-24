import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handles keyboard input simulation
 */
export class KeyboardSimulationHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'input_keyboard_simulate',
            'Simulate keyboard input (press/release/type/combo) with typing speed.',
            {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['press', 'release', 'type', 'combo'],
                        description: 'The keyboard action to perform'
                    },
                    key: {
                        type: 'string',
                        description: 'The key to press/release (for press/release actions)'
                    },
                    keys: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Array of keys for combo action'
                    },
                    text: {
                        type: 'string',
                        description: 'Text to type (for type action)'
                    },
                    typingSpeed: {
                        type: 'number',
                        
                        description: 'Milliseconds per character when typing'
                    }
                },
                required: ['action']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        const { action, key, keys, text } = params;

        if (!action) {
            throw new Error('action is required');
        }

        switch (action) {
            case 'press':
            case 'release':
                if (!key) {
                    throw new Error(`key is required for ${action} action`);
                }
                break;
            case 'type':
                if (!text) {
                    throw new Error('text is required for type action');
                }
                break;
            case 'combo':
                if (!keys || !Array.isArray(keys) || keys.length === 0) {
                    throw new Error('keys array is required for combo action');
                }
                break;        }
    }

    async execute(params) {
        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('simulate_keyboard_input', params);
        return result;
    }
}
