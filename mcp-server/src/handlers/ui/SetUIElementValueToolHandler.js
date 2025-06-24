import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class SetUIElementValueToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'set_ui_element_value',
            'Set values for UI input elements',
            {
                type: 'object',
                properties: {
                    elementPath: {
                        type: 'string',
                        description: 'Full hierarchy path to the UI element'
                    },
                    value: {
                        description: 'New value to set (type depends on element type)'
                    },
                    triggerEvents: {
                        type: 'boolean',
                        default: true,
                        description: 'Whether to trigger associated events'
                    }
                },
                required: ['elementPath', 'value']
            }
        );
        this.unityConnection = unityConnection;
    }

    async execute(params) {
        const {
            elementPath,
            value,
            triggerEvents = true
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('set_ui_element_value', {
            elementPath,
            value,
            triggerEvents
        });

        return result;
    }
}