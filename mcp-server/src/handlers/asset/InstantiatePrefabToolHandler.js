import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class InstantiatePrefabToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'asset_prefab_instantiate',
            'Instantiate a prefab in the scene with optional transform, parent, and name override.',
            {
                type: 'object',
                properties: {
                    prefabPath: {
                        type: 'string',
                        description: 'Asset path to the prefab. Must start with Assets/ and end with .prefab.'
                    },
                    position: {
                        type: 'object',
                        properties: {
                            x: { type: 'number' },
                            y: { type: 'number' },
                            z: { type: 'number' }
                        },
                        description: 'World position for the instance (requires x,y,z).'
                    },
                    rotation: {
                        type: 'object',
                        properties: {
                            x: { type: 'number' },
                            y: { type: 'number' },
                            z: { type: 'number' }
                        },
                        description: 'Euler rotation for the instance (x,y,z).'
                    },
                    parent: {
                        type: 'string',
                        description: 'Parent GameObject scene path (optional).'
                    },
                    name: {
                        type: 'string',
                        description: 'Override name for the instantiated object.'
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

        const { prefabPath, parent, position, rotation } = params;

        // Validate prefabPath format
        if (!prefabPath.startsWith('Assets/') || !prefabPath.endsWith('.prefab')) {
            throw new Error('prefabPath must start with Assets/ and end with .prefab');
        }

        // Validate parent when provided
        if (parent !== undefined && parent === '') {
            throw new Error('parent cannot be empty when provided');
        }

        // Validate position object when provided
        if (position !== undefined) {
            if (typeof position !== 'object' || position === null) {
                throw new Error('position must be an object');
            }
            
            // Check individual properties first for better error messages
            if ('x' in position && typeof position.x !== 'number') {
                throw new Error('position.x must be a number');
            }
            if ('y' in position && typeof position.y !== 'number') {
                throw new Error('position.y must be a number');
            }
            if ('z' in position && typeof position.z !== 'number') {
                throw new Error('position.z must be a number');
            }
            
            // Then check for missing properties
            if (!('x' in position) || !('y' in position) || !('z' in position)) {
                throw new Error('position must have x, y, and z properties');
            }
        }

        // Validate rotation object when provided
        if (rotation !== undefined) {
            if (typeof rotation !== 'object' || rotation === null) {
                throw new Error('rotation must be an object');
            }
            
            if (!('x' in rotation) || !('y' in rotation) || !('z' in rotation)) {
                throw new Error('rotation must have x, y, and z properties');
            }

            if (typeof rotation.x !== 'number') {
                throw new Error('rotation.x must be a number');
            }
            if (typeof rotation.y !== 'number') {
                throw new Error('rotation.y must be a number');
            }
            if (typeof rotation.z !== 'number') {
                throw new Error('rotation.z must be a number');
            }
        }
    }

    async execute(params) {
        const {
            prefabPath,
            position,
            rotation,
            parent,
            name
        } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('instantiate_prefab', {
            prefabPath,
            position,
            rotation,
            parent,
            name
        });

        return result;
    }
}
