import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class GetUIElementStateToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'get_ui_element_state',
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
                        default: false,
                        description: 'Include child element states'
                    },
                    includeInteractableInfo: {
                        type: 'boolean',
                        default: true,
                        description: 'Include interaction capabilities'
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