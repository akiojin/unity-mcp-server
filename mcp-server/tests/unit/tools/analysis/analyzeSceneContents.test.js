import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSceneContentsToolDefinition, analyzeSceneContentsHandler } from '../../../../src/tools/analysis/analyzeSceneContents.js';

describe('AnalyzeSceneContentsTool', () => {
    let mockUnityConnection;
    let sendCommandSpy;

    beforeEach(() => {
        sendCommandSpy = mock.fn(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'SampleScene',
                statistics: {
                    totalGameObjects: 156,
                    activeGameObjects: 142,
                    rootObjects: 12,
                    prefabInstances: 45,
                    uniquePrefabs: 8
                },
                componentDistribution: {
                    Transform: 156,
                    MeshRenderer: 89,
                    Collider: 67,
                    Light: 4,
                    Camera: 2,
                    AudioSource: 12,
                    Scripts: {
                        PlayerController: 1,
                        EnemyAI: 8,
                        GameManager: 1
                    }
                },
                rendering: {
                    materials: 23,
                    textures: 45,
                    meshes: 34,
                    vertices: 125000,
                    triangles: 85000
                },
                lighting: {
                    directionalLights: 1,
                    pointLights: 2,
                    spotLights: 1,
                    realtimeLights: 4,
                    bakedLights: 0
                },
                summary: 'Scene contains 156 GameObjects with 89 renderers and 4 lights'
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
        assert.equal(analyzeSceneContentsToolDefinition.name, 'analysis_scene_contents_analyze');
        assert.equal(analyzeSceneContentsToolDefinition.description, 'Analyze and get statistics about the current scene');
    });

    it('should have correct input schema', () => {
        const schema = analyzeSceneContentsToolDefinition.inputSchema;
        assert.equal(schema.type, 'object');
        assert.ok(schema.properties.includeInactive);
        assert.ok(schema.properties.groupByType);
        assert.ok(schema.properties.includePrefabInfo);
        assert.ok(schema.properties.includeMemoryInfo);
        assert.equal(schema.required, undefined);
    });

    it('should analyze scene with default parameters', async () => {
        const args = {};

        const result = await analyzeSceneContentsHandler(mockUnityConnection, args);

        assert.equal(sendCommandSpy.mock.calls.length, 1);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'analysis_scene_contents_analyze');
        assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);
        
        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Scene contains'));
        assert.ok(result.content[0].text.includes('156 GameObjects'));
    });

    it('should analyze scene with all options enabled', async () => {
        const args = {
            includeInactive: true,
            groupByType: true,
            includePrefabInfo: true,
            includeMemoryInfo: true
        };

        const result = await analyzeSceneContentsHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[1].includeInactive, true);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[1].groupByType, true);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[1].includePrefabInfo, true);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[1].includeMemoryInfo, true);
    });

    it('should handle scene with no objects', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'EmptyScene',
                statistics: {
                    totalGameObjects: 0,
                    activeGameObjects: 0,
                    rootObjects: 0,
                    prefabInstances: 0,
                    uniquePrefabs: 0
                },
                componentDistribution: {
                    Transform: 0
                },
                rendering: {
                    materials: 0,
                    textures: 0,
                    meshes: 0,
                    vertices: 0,
                    triangles: 0
                },
                lighting: {
                    directionalLights: 0,
                    pointLights: 0,
                    spotLights: 0,
                    realtimeLights: 0,
                    bakedLights: 0
                },
                summary: 'Scene is empty'
            }
        }));

        const result = await analyzeSceneContentsHandler(mockUnityConnection, {});

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Scene is empty'));
    });

    it('should handle connection not available', async () => {
        mockUnityConnection.isConnected = () => false;

        const result = await analyzeSceneContentsHandler(mockUnityConnection, {});
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Unity connection not available'));
    });

    it('should handle Unity error response', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'error',
            error: 'Failed to analyze scene: Scene not loaded'
        }));

        const result = await analyzeSceneContentsHandler(mockUnityConnection, {});
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Failed to analyze scene'));
    });

    it('should handle command timeout', async () => {
        sendCommandSpy.mock.mockImplementation(() => 
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Command timeout')), 100)
            )
        );

        const result = await analyzeSceneContentsHandler(mockUnityConnection, {});
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Command timeout'));
    });

    it('should include memory info when requested', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'SampleScene',
                statistics: {
                    totalGameObjects: 50,
                    activeGameObjects: 50
                },
                memoryInfo: {
                    totalMemoryMB: 125.5,
                    textureMemoryMB: 65.2,
                    meshMemoryMB: 12.3,
                    audioMemoryMB: 8.0
                },
                summary: 'Scene analysis complete with memory info'
            }
        }));

        const result = await analyzeSceneContentsHandler(mockUnityConnection, { includeMemoryInfo: true });

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('memory info'));
    });
});
