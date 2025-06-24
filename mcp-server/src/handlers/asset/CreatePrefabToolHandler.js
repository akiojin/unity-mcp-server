import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class CreatePrefabToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'create_prefab',
            'Create a new prefab from a GameObject or from scratch',
            {
                type: 'object',
                properties: {
                    gameObjectPath: {
                        type: 'string',
                        description: 'Path to GameObject to convert to prefab'
                    },
                    prefabPath: {
                        type: 'string',
                        description: 'Asset path where prefab should be saved (must start with Assets/ and end with .prefab)'
                    },
                    createFromTemplate: {
                        type: 'boolean',
                        default: false,
                        description: 'Create empty prefab without source GameObject'
                    },
                    overwrite: {
                        type: 'boolean',
                        default: false,
                        description: 'Overwrite existing prefab if it exists'
                    }
                },
                required: ['prefabPath']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        // Call parent validation for required fields
        super.validate(params);

        const { prefabPath, gameObjectPath, createFromTemplate } = params;

        // Validate prefabPath format
        if (!prefabPath.startsWith('Assets/') || !prefabPath.endsWith('.prefab')) {
            throw new Error('prefabPath must start with Assets/ and end with .prefab');
        }

        // Validate gameObjectPath when provided
        if (gameObjectPath !== undefined && gameObjectPath === '') {
            throw new Error('gameObjectPath cannot be empty when provided');
        }

        // Validate mutually exclusive options
        if (gameObjectPath && createFromTemplate) {
            throw new Error('Cannot specify both gameObjectPath and createFromTemplate');
        }
    }

    async execute(params) {
        const {
            gameObjectPath,
            prefabPath,
            createFromTemplate = false,
            overwrite = false
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('create_prefab', {
            gameObjectPath,
            prefabPath,
            createFromTemplate,
            overwrite
        });

        return result;
    }
}