import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class FindUIElementsToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'find_ui_elements',
            'Find UI elements in Unity scene by type, tag, or name',
            {
                type: 'object',
                properties: {
                    elementType: {
                        type: 'string',
                        description: 'Filter by UI component type (Button, Toggle, Slider, etc.)'
                    },
                    tagFilter: {
                        type: 'string',
                        description: 'Filter by GameObject tag'
                    },
                    namePattern: {
                        type: 'string',
                        description: 'Search by name pattern/regex'
                    },
                    includeInactive: {
                        type: 'boolean',
                        description: 'Include inactive UI elements',
                        default: false
                    },
                    canvasFilter: {
                        type: 'string',
                        description: 'Filter by parent Canvas name'
                    }
                },
                required: []
            }
        );
        this.unityConnection = unityConnection;
    }


    async execute(params = {}) {
        const {
            elementType,
            tagFilter,
            namePattern,
            includeInactive = false,
            canvasFilter
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('find_ui_elements', {
            elementType,
            tagFilter,
            namePattern,
            includeInactive,
            canvasFilter
        });

        // Return the result for the BaseToolHandler to format
        return result;
    }
}