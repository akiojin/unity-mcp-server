import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class FindUIElementsToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'ui_find_elements',
            'Find UI elements by component type, tag, or name pattern.',
            {
                type: 'object',
                properties: {
                    elementType: {
                        type: 'string',
                        description: 'UI component type (e.g., Button, Toggle, Slider).'
                    },
                    tagFilter: {
                        type: 'string',
                        description: 'Filter by GameObject tag.'
                    },
                    namePattern: {
                        type: 'string',
                        description: 'Search by name substring or regex.'
                    },
                    includeInactive: {
                        type: 'boolean',
                        description: 'If true, include inactive UI elements.'
                    },
                    canvasFilter: {
                        type: 'string',
                        description: 'Filter by parent Canvas name.'
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
