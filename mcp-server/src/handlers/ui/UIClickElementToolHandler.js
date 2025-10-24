import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class UIClickElementToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'ui_click_element',
            'Simulate clicking on UI elements',
            {
                type: 'object',
                properties: {
                    elementPath: {
                        type: 'string',
                        description: 'Full hierarchy path to the UI element'
                    },
                    clickType: {
                        type: 'string',
                        enum: ['left', 'right', 'middle'],
                        
                        description: 'Type of click (left, right, middle)'
                    },
                    holdDuration: {
                        type: 'number',
                        
                        minimum: 0,
                        maximum: 10000,
                        description: 'Duration to hold click in milliseconds'
                    },
                    position: {
                        type: 'object',
                        properties: {
                            x: {
                                type: 'number',
                                minimum: 0,
                                maximum: 1,
                                description: 'X position within element (0-1)'
                            },
                            y: {
                                type: 'number',
                                minimum: 0,
                                maximum: 1,
                                description: 'Y position within element (0-1)'
                            }
                        },
                        description: 'Specific position within element to click'
                    }
                },
                required: ['elementPath']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        // Call parent validation for required fields
        super.validate(params);

        // Validate clickType enum
        if (params.clickType && !['left', 'right', 'middle'].includes(params.clickType)) {
            throw new Error('clickType must be one of: left, right, middle');
        }

        // Validate holdDuration range
        if (params.holdDuration !== undefined) {
            const duration = params.holdDuration;
            if (typeof duration !== 'number' || duration < 0 || duration > 10000) {
                throw new Error('holdDuration must be between 0 and 10000 milliseconds');
            }
        }

        // Validate position object
        if (params.position) {
            const pos = params.position;
            if (pos.x !== undefined && typeof pos.x !== 'number') {
                throw new Error('position.x must be a number');
            }
            if (pos.y !== undefined && typeof pos.y !== 'number') {
                throw new Error('position.y must be a number');
            }
            if (pos.x !== undefined && (pos.x < 0 || pos.x > 1)) {
                throw new Error('position.x must be between 0 and 1');
            }
            if (pos.y !== undefined && (pos.y < 0 || pos.y > 1)) {
                throw new Error('position.y must be between 0 and 1');
            }
        }
    }

    async execute(params) {
        const {
            elementPath,
            clickType = 'left',
            holdDuration = 0,
            position
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('click_ui_element', {
            elementPath,
            clickType,
            holdDuration,
            position
        });

        return result;
    }
}