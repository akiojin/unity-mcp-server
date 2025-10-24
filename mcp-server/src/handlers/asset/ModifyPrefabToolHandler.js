import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ModifyPrefabToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'asset_prefab_modify',
            'Modify an existing prefab by applying property changes (optionally to instances).',
            {
                type: 'object',
                properties: {
                    prefabPath: {
                        type: 'string',
                        description: 'Asset path to the prefab. Must start with Assets/ and end with .prefab.'
                    },
                    modifications: {
                        type: 'object',
                        description: 'Key/value object of properties to modify on the prefab.'
                    },
                    applyToInstances: {
                        type: 'boolean',
                        description: 'If true, also apply to existing scene instances (default: true).'
                    }
                },
                required: ['prefabPath', 'modifications']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        // Call parent validation for required fields
        super.validate(params);

        const { prefabPath, modifications } = params;

        // Validate prefabPath format
        if (!prefabPath.startsWith('Assets/') || !prefabPath.endsWith('.prefab')) {
            throw new Error('prefabPath must start with Assets/ and end with .prefab');
        }

        // Validate modifications is object
        if (typeof modifications !== 'object' || modifications === null || Array.isArray(modifications)) {
            throw new Error('modifications must be an object');
        }

        // Validate modifications is not empty
        if (Object.keys(modifications).length === 0) {
            throw new Error('modifications cannot be empty');
        }
    }

    async execute(params) {
        const {
            prefabPath,
            modifications,
            applyToInstances = true
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('modify_prefab', {
            prefabPath,
            modifications,
            applyToInstances
        });

        return result;
    }
}
