import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { getObjectReferencesToolDefinition, getObjectReferencesHandler } from '../../../../src/tools/analysis/getObjectReferences.js';

describe('GetObjectReferencesTool', () => {
    let mockUnityConnection;
    let sendCommandSpy;

    beforeEach(() => {
        sendCommandSpy = mock.fn(() => Promise.resolve({
            status: 'success',
            result: {
                targetObject: 'Player',
                targetPath: '/Player',
                references: {
                    referencedBy: [
                        {
                            gameObject: 'GameManager',
                            path: '/GameManager',
                            component: 'GameController',
                            property: 'playerObject',
                            referenceType: 'direct'
                        },
                        {
                            gameObject: 'CameraFollow',
                            path: '/Main Camera/CameraFollow',
                            component: 'FollowTarget',
                            property: 'target',
                            referenceType: 'transform'
                        }
                    ],
                    referencesTo: [
                        {
                            gameObject: 'PlayerModel',
                            path: '/Player/PlayerModel',
                            component: 'MeshRenderer',
                            property: 'sharedMaterial',
                            referenceType: 'asset',
                            assetPath: 'Assets/Materials/PlayerMaterial.mat'
                        },
                        {
                            gameObject: 'HealthBar',
                            path: '/UI/HealthBar',
                            component: 'Transform',
                            property: 'parent',
                            referenceType: 'hierarchy'
                        }
                    ]
                },
                stats: {
                    totalReferencedBy: 2,
                    totalReferencesTo: 2,
                    componentCount: 5,
                    searchedObjects: 150
                },
                summary: 'Player is referenced by 2 objects and references 2 objects'
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
        assert.equal(getObjectReferencesToolDefinition.name, 'analysis_object_references_get');
        assert.equal(getObjectReferencesToolDefinition.description, 'Find all references to and from a GameObject');
    });

    it('should have correct input schema', () => {
        const schema = getObjectReferencesToolDefinition.inputSchema;
        assert.equal(schema.type, 'object');
        assert.ok(schema.properties.gameObjectName);
        assert.ok(schema.properties.includeAssetReferences);
        assert.ok(schema.properties.includeHierarchyReferences);
        assert.ok(schema.properties.searchInPrefabs);
        assert.deepEqual(schema.required, ['gameObjectName']);
    });

    it('should get object references with minimum parameters', async () => {
        const args = {
            gameObjectName: 'Player'
        };

        const result = await getObjectReferencesHandler(mockUnityConnection, args);

        assert.equal(sendCommandSpy.mock.calls.length, 1);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'analysis_object_references_get');
        assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);
        
        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('referenced by 2'));
        assert.ok(result.content[0].text.includes('references 2'));
    });

    it('should get references with all parameters', async () => {
        const args = {
            gameObjectName: 'Enemy',
            includeAssetReferences: false,
            includeHierarchyReferences: false,
            searchInPrefabs: true
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                targetObject: 'Enemy',
                targetPath: '/Enemies/Enemy',
                references: {
                    referencedBy: [
                        {
                            gameObject: 'SpawnManager',
                            path: 'Assets/Prefabs/SpawnManager.prefab',
                            component: 'EnemySpawner',
                            property: 'enemyPrefab',
                            referenceType: 'prefab',
                            location: 'prefab'
                        }
                    ],
                    referencesTo: [
                        {
                            gameObject: 'Target',
                            path: '/Player',
                            component: 'EnemyAI',
                            property: 'currentTarget',
                            referenceType: 'direct'
                        }
                    ]
                },
                stats: {
                    totalReferencedBy: 1,
                    totalReferencesTo: 1,
                    componentCount: 3,
                    searchedObjects: 50,
                    searchedPrefabs: 25
                },
                summary: 'Enemy is referenced by 1 prefab and references 1 object'
            }
        }));

        const result = await getObjectReferencesHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[1].includeAssetReferences, false);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[1].searchInPrefabs, true);
    });

    it('should handle no references found', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                targetObject: 'IsolatedObject',
                targetPath: '/IsolatedObject',
                references: {
                    referencedBy: [],
                    referencesTo: []
                },
                stats: {
                    totalReferencedBy: 0,
                    totalReferencesTo: 0,
                    componentCount: 1,
                    searchedObjects: 100
                },
                summary: 'IsolatedObject has no references'
            }
        }));

        const result = await getObjectReferencesHandler(mockUnityConnection, { 
            gameObjectName: 'IsolatedObject' 
        });

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('no references'));
    });

    it('should handle circular references', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                targetObject: 'ObjectA',
                targetPath: '/ObjectA',
                references: {
                    referencedBy: [
                        {
                            gameObject: 'ObjectB',
                            path: '/ObjectB',
                            component: 'ComponentB',
                            property: 'referenceToA',
                            referenceType: 'direct'
                        }
                    ],
                    referencesTo: [
                        {
                            gameObject: 'ObjectB',
                            path: '/ObjectB',
                            component: 'ComponentA',
                            property: 'referenceToB',
                            referenceType: 'direct'
                        }
                    ]
                },
                stats: {
                    totalReferencedBy: 1,
                    totalReferencesTo: 1,
                    componentCount: 2,
                    searchedObjects: 100,
                    circularReferences: ['ObjectB']
                },
                summary: 'ObjectA is referenced by 1 object and references 1 object (circular reference detected)'
            }
        }));

        const result = await getObjectReferencesHandler(mockUnityConnection, { 
            gameObjectName: 'ObjectA' 
        });

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('circular reference'));
    });

    it('should handle connection not available', async () => {
        mockUnityConnection.isConnected = () => false;

        const result = await getObjectReferencesHandler(mockUnityConnection, { 
            gameObjectName: 'Player' 
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Unity connection not available'));
    });

    it('should handle GameObject not found', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'error',
            error: 'GameObject not found: NonExistent'
        }));

        const result = await getObjectReferencesHandler(mockUnityConnection, {
            gameObjectName: 'NonExistent'
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('GameObject not found'));
    });

    it('should handle asset references', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                targetObject: 'Cube',
                targetPath: '/Cube',
                references: {
                    referencedBy: [],
                    referencesTo: [
                        {
                            gameObject: 'DefaultMaterial',
                            path: null,
                            component: 'MeshRenderer',
                            property: 'sharedMaterial',
                            referenceType: 'asset',
                            assetPath: 'Assets/Materials/DefaultMaterial.mat'
                        },
                        {
                            gameObject: 'CubeMesh',
                            path: null,
                            component: 'MeshFilter',
                            property: 'sharedMesh',
                            referenceType: 'asset',
                            assetPath: 'Library/unity default resources/Cube.fbx'
                        }
                    ]
                },
                stats: {
                    totalReferencedBy: 0,
                    totalReferencesTo: 2,
                    componentCount: 3,
                    searchedObjects: 100,
                    assetReferences: 2
                },
                summary: 'Cube references 2 assets'
            }
        }));

        const result = await getObjectReferencesHandler(mockUnityConnection, { 
            gameObjectName: 'Cube',
            includeAssetReferences: true 
        });

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('2 assets'));
    });

    it('should handle command timeout', async () => {
        sendCommandSpy.mock.mockImplementation(() => 
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Command timeout')), 100)
            )
        );

        const result = await getObjectReferencesHandler(mockUnityConnection, {
            gameObjectName: 'Player'
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Command timeout'));
    });

    it('should handle prefab references', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                targetObject: 'EnemyPrefab',
                targetPath: 'Assets/Prefabs/EnemyPrefab.prefab',
                isPrefab: true,
                references: {
                    referencedBy: [
                        {
                            gameObject: 'Level1',
                            path: '/Levels/Level1',
                            component: 'LevelSetup',
                            property: 'enemyPrefabs',
                            referenceType: 'prefab',
                            location: 'scene'
                        },
                        {
                            gameObject: 'WaveSpawner',
                            path: 'Assets/Prefabs/WaveSpawner.prefab',
                            component: 'WaveManager',
                            property: 'enemyTypes',
                            referenceType: 'prefab',
                            location: 'prefab'
                        }
                    ],
                    referencesTo: []
                },
                stats: {
                    totalReferencedBy: 2,
                    totalReferencesTo: 0,
                    searchedObjects: 50,
                    searchedPrefabs: 30,
                    prefabInstances: 5
                },
                summary: 'EnemyPrefab is referenced by 2 objects (5 instances in scenes)'
            }
        }));

        const result = await getObjectReferencesHandler(mockUnityConnection, { 
            gameObjectName: 'EnemyPrefab',
            searchInPrefabs: true 
        });

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('5 instances'));
    });
});