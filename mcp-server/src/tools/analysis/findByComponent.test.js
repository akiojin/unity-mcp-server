import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { findByComponentToolDefinition, findByComponentHandler } from './findByComponent.js';

describe('FindByComponentTool', () => {
    let mockUnityConnection;
    let sendCommandSpy;

    beforeEach(() => {
        sendCommandSpy = mock.fn(() => Promise.resolve({
            status: 'success',
            result: {
                componentType: 'Light',
                searchScope: 'scene',
                results: [
                    {
                        gameObject: 'Directional Light',
                        path: '/Directional Light',
                        componentCount: 1,
                        isActive: true
                    },
                    {
                        gameObject: 'Point Light',
                        path: '/Lights/Point Light',
                        componentCount: 1,
                        isActive: true
                    },
                    {
                        gameObject: 'Spot Light',
                        path: '/Lights/Spot Light',
                        componentCount: 1,
                        isActive: false
                    }
                ],
                totalFound: 3,
                activeCount: 2,
                summary: 'Found 3 GameObjects with Light component (2 active)'
            }
        }));

        mockUnityConnection = {
            sendCommand: sendCommandSpy,
            isConnected: () => true
        };
    });

    afterEach(() => {
        mock.restoreAll();
    });

    it('should have correct tool definition', () => {
        assert.equal(findByComponentToolDefinition.name, 'find_by_component');
        assert.equal(findByComponentToolDefinition.description, 'Find all GameObjects that have a specific component type');
    });

    it('should have correct input schema', () => {
        const schema = findByComponentToolDefinition.inputSchema;
        assert.equal(schema.type, 'object');
        assert.ok(schema.properties.componentType);
        assert.ok(schema.properties.includeInactive);
        assert.ok(schema.properties.searchScope);
        assert.ok(schema.properties.matchExactType);
        assert.deepEqual(schema.required, ['componentType']);
    });

    it('should find GameObjects with Light component', async () => {
        const args = {
            componentType: 'Light'
        };

        const result = await findByComponentHandler(mockUnityConnection, args);

        assert.equal(sendCommandSpy.mock.calls.length, 1);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'find_by_component');
        assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);
        
        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Found 3 GameObjects'));
        assert.ok(result.content[0].text.includes('2 active'));
    });

    it('should find with all parameters', async () => {
        const args = {
            componentType: 'Collider',
            includeInactive: false,
            searchScope: 'prefabs',
            matchExactType: false
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                componentType: 'Collider',
                searchScope: 'prefabs',
                results: [
                    {
                        gameObject: 'PlayerPrefab',
                        path: 'Assets/Prefabs/PlayerPrefab.prefab',
                        componentCount: 2,
                        isActive: true,
                        componentTypes: ['BoxCollider', 'CapsuleCollider']
                    },
                    {
                        gameObject: 'EnemyPrefab',
                        path: 'Assets/Prefabs/EnemyPrefab.prefab',
                        componentCount: 1,
                        isActive: true,
                        componentTypes: ['SphereCollider']
                    }
                ],
                totalFound: 2,
                activeCount: 2,
                summary: 'Found 2 prefabs with Collider-derived components'
            }
        }));

        const result = await findByComponentHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[1].includeInactive, false);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[1].searchScope, 'prefabs');
        assert.equal(sendCommandSpy.mock.calls[0].arguments[1].matchExactType, false);
    });

    it('should handle finding derived components', async () => {
        const args = {
            componentType: 'Renderer',
            matchExactType: false
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                componentType: 'Renderer',
                searchScope: 'scene',
                results: [
                    {
                        gameObject: 'Cube',
                        path: '/Cube',
                        componentCount: 1,
                        isActive: true,
                        componentTypes: ['MeshRenderer']
                    },
                    {
                        gameObject: 'Sphere',
                        path: '/Sphere',
                        componentCount: 1,
                        isActive: true,
                        componentTypes: ['MeshRenderer']
                    },
                    {
                        gameObject: 'Particles',
                        path: '/Effects/Particles',
                        componentCount: 1,
                        isActive: true,
                        componentTypes: ['ParticleSystemRenderer']
                    }
                ],
                totalFound: 3,
                activeCount: 3,
                summary: 'Found 3 GameObjects with Renderer-derived components'
            }
        }));

        const result = await findByComponentHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Renderer-derived'));
    });

    it('should handle no results found', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                componentType: 'CustomScript',
                searchScope: 'scene',
                results: [],
                totalFound: 0,
                activeCount: 0,
                summary: 'No GameObjects found with CustomScript component'
            }
        }));

        const result = await findByComponentHandler(mockUnityConnection, { 
            componentType: 'CustomScript' 
        });

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('No GameObjects found'));
    });

    it('should handle connection not available', async () => {
        mockUnityConnection.isConnected = () => false;

        const result = await findByComponentHandler(mockUnityConnection, { 
            componentType: 'Light' 
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Unity connection not available'));
    });

    it('should handle error response', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'error',
            error: 'Invalid component type: NonExistentComponent'
        }));

        const result = await findByComponentHandler(mockUnityConnection, {
            componentType: 'NonExistentComponent'
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Invalid component type'));
    });

    it('should validate searchScope values', async () => {
        const args = {
            componentType: 'Light',
            searchScope: 'invalid'
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'error',
            error: 'Invalid searchScope. Must be one of: scene, prefabs, all'
        }));

        const result = await findByComponentHandler(mockUnityConnection, args);
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Invalid searchScope'));
    });

    it('should handle command timeout', async () => {
        sendCommandSpy.mock.mockImplementation(() => 
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Command timeout')), 100)
            )
        );

        const result = await findByComponentHandler(mockUnityConnection, {
            componentType: 'Light'
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Command timeout'));
    });

    it('should handle searching all locations', async () => {
        const args = {
            componentType: 'AudioSource',
            searchScope: 'all'
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                componentType: 'AudioSource',
                searchScope: 'all',
                results: [
                    {
                        gameObject: 'BackgroundMusic',
                        path: '/Audio/BackgroundMusic',
                        componentCount: 1,
                        isActive: true,
                        location: 'scene'
                    },
                    {
                        gameObject: 'PlayerPrefab',
                        path: 'Assets/Prefabs/PlayerPrefab.prefab',
                        componentCount: 2,
                        isActive: true,
                        location: 'prefab'
                    }
                ],
                totalFound: 2,
                activeCount: 2,
                sceneCount: 1,
                prefabCount: 1,
                summary: 'Found 2 GameObjects with AudioSource component (1 in scene, 1 in prefabs)'
            }
        }));

        const result = await findByComponentHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('1 in scene'));
        assert.ok(result.content[0].text.includes('1 in prefabs'));
    });
});