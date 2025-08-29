import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ModifyMaterialToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'modify_material',
            'Modify a material by updating property values and/or changing the shader.',
            {
                type: 'object',
                properties: {
                    materialPath: {
                        type: 'string',
                        description: 'Asset path to the material. Must start with Assets/ and end with .mat.'
                    },
                    properties: {
                        type: 'object',
                        description: 'Property updates (e.g., {"_Color":[1,0,0,1], "_Metallic":0.5}).'
                    },
                    shader: {
                        type: 'string',
                        description: 'Optional: change the shader (e.g., Standard, Unlit/Color).'
                    }
                },
                required: ['materialPath', 'properties']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        // Call parent validation for required fields
        super.validate(params);

        const { materialPath, properties, shader } = params;

        // Validate materialPath format
        if (!materialPath.startsWith('Assets/') || !materialPath.endsWith('.mat')) {
            throw new Error('materialPath must start with Assets/ and end with .mat');
        }

        // Validate properties
        if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
            throw new Error('properties must be an object');
        }

        if (Object.keys(properties).length === 0) {
            throw new Error('properties cannot be empty');
        }

        // Validate shader when provided
        if (shader !== undefined && shader === '') {
            throw new Error('shader cannot be empty when provided');
        }
    }

    async execute(params) {
        const {
            materialPath,
            properties,
            shader
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('modify_material', {
            materialPath,
            properties,
            shader
        });

        return result;
    }
}
