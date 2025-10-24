import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class UIGetElementStateToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'ui_get_element_state',
            'Get detailed state information about UI elements',
            {
                type: 'object',
                properties: {
                    elementPath: {
                        type: 'string',
                        description: 'Full hierarchy path to the UI element'
                    },
                    includeChildren: {
                        type: 'boolean',
                        description: 'Include child element states (default: false)'
                    },
                    includeInteractableInfo: {
                        type: 'boolean',
                        description: 'Include interaction capabilities (default: true)'
                    }
                },
                required: ['elementPath']
            }
        );
        this.unityConnection = unityConnection;
    }

    async execute(params) {
        const {
            elementPath,
            includeChildren = false,
            includeInteractableInfo = true
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('get_ui_element_state', {
            elementPath,
            includeChildren,
            includeInteractableInfo
        });

        return result;
    }
}