import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class CreatePrefabToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'asset_prefab_create',
            'Create a prefab from a GameObject path or create an empty prefab at a target asset path.',
            {
                type: 'object',
                properties: {
                    gameObjectPath: {
                        type: 'string',
                        description: 'Scene path to convert (e.g., "/Root/Player"). Mutually exclusive with createFromTemplate.'
                    },
                    prefabPath: {
                        type: 'string',
                        description: 'Asset path for the prefab. Must start with Assets/ and end with .prefab.'
                    },
                    createFromTemplate: {
                        type: 'boolean',
                        description: 'If true, create an empty prefab (no source GameObject) (default: false).'
                    },
                    overwrite: {
                        type: 'boolean',
                        description: 'If true, overwrite existing prefab at the destination path (default: false).'
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
