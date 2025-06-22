import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { getGameObjectDetailsToolDefinition, getGameObjectDetailsHandler } from './getGameObjectDetails.js';

describe('GetGameObjectDetailsTool', () => {
    let mockUnityConnection;
    let sendCommandSpy;

    beforeEach(() => {
        sendCommandSpy = mock.fn(() => Promise.resolve({
            status: 'success',
            result: {
                name: 'Player',
                path: '/Game/Characters/Player',
                isActive: true,
                isStatic: false,
                tag: 'Player',
                layer: 'Characters',
                transform: {
                    position: { x: 0, y: 1, z: 0 },
                    rotation: { x: 0, y: 45, z: 0 },
                    scale: { x: 1, y: 1, z: 1 },
                    worldPosition: { x: 0, y: 1, z: 0 }
                },
                components: [
                    {
                        type: 'Transform',
                        enabled: true,
                        properties: {
                            position: { x: 0, y: 1, z: 0 },
                            rotation: { x: 0, y: 45, z: 0 },
                            scale: { x: 1, y: 1, z: 1 }
                        }
                    },
                    {
                        type: 'MeshRenderer',
                        enabled: true,
                        properties: {
                            shadowCastingMode: 'On',
                            receiveShadows: true,
                            materials: ['PlayerMaterial']
                        }
                    }
                ],
                children: [],
                prefabInfo: {
                    isPrefab: true,
                    prefabPath: 'Assets/Prefabs/Player.prefab',
                    isInstance: true
                },
                summary: 'GameObject "Player" with 2 components at /Game/Characters/Player'
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
        assert.equal(getGameObjectDetailsToolDefinition.name, 'get_gameobject_details');
        assert.equal(getGameObjectDetailsToolDefinition.description, 'Get detailed information about a specific GameObject');
    });

    it('should have correct input schema', () => {
        const schema = getGameObjectDetailsToolDefinition.inputSchema;
        assert.equal(schema.type, 'object');
        assert.ok(schema.properties.gameObjectName);
        assert.ok(schema.properties.path);
        assert.ok(schema.properties.includeChildren);
        assert.ok(schema.properties.includeComponents);
        assert.ok(schema.properties.includeMaterials);
        assert.ok(schema.properties.maxDepth);
        assert.deepEqual(schema.required, ['gameObjectName']);
    });

    it('should get GameObject details by name', async () => {
        const args = {
            gameObjectName: 'Player',
            includeComponents: true
        };

        const result = await getGameObjectDetailsHandler(mockUnityConnection, args);

        assert.equal(sendCommandSpy.mock.calls.length, 1);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'get_gameobject_details');
        assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);
        
        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('GameObject "Player"'));
        assert.ok(result.content[0].text.includes('2 components'));
    });

    it('should get GameObject details with children', async () => {
        const args = {
            gameObjectName: 'UICanvas',
            includeChildren: true,
            maxDepth: 2
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                name: 'UICanvas',
                path: '/UICanvas',
                isActive: true,
                components: [{type: 'Canvas'}, {type: 'CanvasScaler'}],
                children: [
                    {
                        name: 'MainPanel',
                        path: '/UICanvas/MainPanel',
                        components: [{type: 'RectTransform'}, {type: 'Image'}],
                        children: [
                            {
                                name: 'Button',
                                path: '/UICanvas/MainPanel/Button',
                                components: [{type: 'Button'}, {type: 'Image'}]
                            }
                        ]
                    }
                ],
                summary: 'GameObject "UICanvas" with 2 components and 2 children at /UICanvas'
            }
        }));

        const result = await getGameObjectDetailsHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('UICanvas'));
        assert.ok(result.content[0].text.includes('2 children'));
    });

    it('should get GameObject by path', async () => {
        const args = {
            path: '/Environment/Props/Crate_01',
            includeComponents: true,
            includeMaterials: true
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                name: 'Crate_01',
                path: '/Environment/Props/Crate_01',
                isActive: true,
                components: [
                    {
                        type: 'MeshRenderer',
                        enabled: true,
                        properties: {
                            materials: ['WoodCrateMaterial']
                        }
                    }
                ],
                materials: [
                    {
                        name: 'WoodCrateMaterial',
                        shader: 'Standard',
                        properties: {
                            _Color: { r: 0.5, g: 0.3, b: 0.1, a: 1 },
                            _MainTex: 'wood_diffuse.png'
                        }
                    }
                ],
                summary: 'GameObject "Crate_01" with 1 component and materials at /Environment/Props/Crate_01'
            }
        }));

        const result = await getGameObjectDetailsHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Crate_01'));
        assert.ok(result.content[0].text.includes('materials'));
    });

    it('should handle connection not available', async () => {
        mockUnityConnection.isConnected = () => false;

        const result = await getGameObjectDetailsHandler(mockUnityConnection, { gameObjectName: 'Test' });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Unity connection not available'));
    });

    it('should handle GameObject not found', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'error',
            error: 'GameObject not found: NonExistent'
        }));

        const result = await getGameObjectDetailsHandler(mockUnityConnection, { gameObjectName: 'NonExistent' });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('GameObject not found'));
    });

    it('should validate that either gameObjectName or path is provided', async () => {
        const result = await getGameObjectDetailsHandler(mockUnityConnection, {});
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Either gameObjectName or path must be provided'));
    });

    it('should validate that only one identifier is provided', async () => {
        const result = await getGameObjectDetailsHandler(mockUnityConnection, {
            gameObjectName: 'Test',
            path: '/Test'
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Provide either gameObjectName or path, not both'));
    });

    it('should handle invalid maxDepth', async () => {
        const result = await getGameObjectDetailsHandler(mockUnityConnection, {
            gameObjectName: 'Test',
            maxDepth: -1
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('maxDepth must be between 0 and 10'));
    });

    it('should handle command timeout', async () => {
        sendCommandSpy.mock.mockImplementation(() => 
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Command timeout')), 100)
            )
        );

        const result = await getGameObjectDetailsHandler(mockUnityConnection, { gameObjectName: 'Test' });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Command timeout'));
    });
});