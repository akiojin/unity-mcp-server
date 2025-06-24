import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class CreateMaterialToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'create_material',
            'Create a new material in Unity with specified shader and properties',
            {
                type: 'object',
                properties: {
                    materialPath: {
                        type: 'string',
                        description: 'Asset path for the material (must start with Assets/ and end with .mat)'
                    },
                    shader: {
                        type: 'string',
                        description: 'Shader to use (e.g., "Standard", "Unlit/Color", "Universal Render Pipeline/Lit")'
                    },
                    properties: {
                        type: 'object',
                        description: 'Material properties to set (e.g., {"_Color": [1,0,0,1], "_Metallic": 0.5})'
                    },
                    copyFrom: {
                        type: 'string',
                        description: 'Path to existing material to copy from'
                    },
                    overwrite: {
                        type: 'boolean',
                        description: 'Whether to overwrite existing material',
                        default: false
                    }
                },
                required: ['materialPath']
            }
        );
        this.unityConnection = unityConnection;
    }

    validate(params) {
        // Call parent validation for required fields
        super.validate(params);

        const { materialPath, shader, properties, copyFrom } = params;

        // Validate materialPath format
        if (!materialPath.startsWith('Assets/') || !materialPath.endsWith('.mat')) {
            throw new Error('materialPath must start with Assets/ and end with .mat');
        }

        // Validate shader when provided
        if (shader !== undefined && shader === '') {
            throw new Error('shader cannot be empty when provided');
        }

        // Validate properties when provided
        if (properties !== undefined) {
            if (typeof properties !== 'object' || properties === null) {
                throw new Error('properties must be an object');
            }
        }

        // Validate copyFrom when provided
        if (copyFrom !== undefined) {
            if (copyFrom === '') {
                throw new Error('copyFrom cannot be empty when provided');
            }
            if (!copyFrom.startsWith('Assets/') || !copyFrom.endsWith('.mat')) {
                throw new Error('copyFrom must be a valid material path (Assets/.../.mat)');
            }
        }
    }

    async execute(params) {
        const {
            materialPath,
            shader,
            properties,
            copyFrom,
            overwrite
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('create_material', {
            materialPath,
            shader,
            properties,
            copyFrom,
            overwrite
        });

        return result;
    }
}