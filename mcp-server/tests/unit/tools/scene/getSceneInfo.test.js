import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { getSceneInfoToolDefinition, getSceneInfoHandler } from '../../../../src/tools/scene/getSceneInfo.js';

describe('GetSceneInfoTool', () => {
    let mockUnityConnection;
    let sendCommandSpy;

    beforeEach(() => {
        sendCommandSpy = mock.fn(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'MainMenu',
                scenePath: 'Assets/Scenes/MainMenu.unity',
                isLoaded: true,
                isActive: true,
                isDirty: false,
                buildIndex: 0,
                rootGameObjects: [
                    { name: 'Main Camera', childCount: 0 },
                    { name: 'Directional Light', childCount: 0 },
                    { name: 'EventSystem', childCount: 0 },
                    { name: 'Canvas', childCount: 3 }
                ],
                rootObjectCount: 4,
                totalObjectCount: 7,
                summary: 'Scene "MainMenu" - Loaded and active, 7 total GameObjects'
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
        assert.equal(getSceneInfoToolDefinition.name, 'scene_info_get');
        assert.equal(getSceneInfoToolDefinition.description, 'Get detailed information about a scene');
    });

    it('should have correct input schema', () => {
        const schema = getSceneInfoToolDefinition.inputSchema;
        assert.equal(schema.type, 'object');
        assert.ok(schema.properties.scenePath);
        assert.ok(schema.properties.sceneName);
        assert.ok(schema.properties.includeGameObjects);
        assert.equal(schema.required, undefined);
    });

    it('should get info about current scene without parameters', async () => {
        const args = {};

        const result = await getSceneInfoHandler(mockUnityConnection, args);

        assert.equal(sendCommandSpy.mock.calls.length, 1);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'get_scene_info');
        assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);
        
        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Scene "MainMenu"'));
        assert.ok(result.content[0].text.includes('Loaded and active'));
        assert.ok(result.content[0].text.includes('7 total GameObjects'));
    });

    it('should get info by scene path', async () => {
        const args = {
            scenePath: 'Assets/Levels/Level1.unity'
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'Level1',
                scenePath: 'Assets/Levels/Level1.unity',
                isLoaded: false,
                isActive: false,
                isDirty: false,
                buildIndex: 1,
                fileSize: 1048576,
                lastModified: '2025-06-22T10:30:00Z',
                summary: 'Scene "Level1" - Not loaded, in build settings (index: 1), 1.0 MB'
            }
        }));

        const result = await getSceneInfoHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Not loaded'));
        assert.ok(result.content[0].text.includes('build settings'));
        assert.ok(result.content[0].text.includes('1.0 MB'));
    });

    it('should get info by scene name', async () => {
        const args = {
            sceneName: 'TestScene'
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'TestScene',
                scenePath: 'Assets/Scenes/TestScene.unity',
                isLoaded: false,
                isActive: false,
                isDirty: false,
                buildIndex: -1,
                summary: 'Scene "TestScene" - Not loaded, not in build settings'
            }
        }));

        const result = await getSceneInfoHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('not in build settings'));
    });

    it('should include GameObject details when requested', async () => {
        const args = {
            includeGameObjects: true
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'MainMenu',
                scenePath: 'Assets/Scenes/MainMenu.unity',
                isLoaded: true,
                isActive: true,
                isDirty: true,
                buildIndex: 0,
                rootGameObjects: [
                    { name: 'Main Camera', childCount: 0 },
                    { name: 'Canvas', childCount: 3 }
                ],
                rootObjectCount: 2,
                totalObjectCount: 5,
                summary: 'Scene "MainMenu" - Loaded and active (unsaved changes), 5 total GameObjects'
            }
        }));

        const result = await getSceneInfoHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('unsaved changes'));
    });

    it('should handle connection not available', async () => {
        mockUnityConnection.isConnected = () => false;

        const result = await getSceneInfoHandler(mockUnityConnection, {});
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Unity connection not available'));
    });

    it('should handle scene not found error', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'error',
            error: 'Scene not found: NonExistentScene'
        }));

        const result = await getSceneInfoHandler(mockUnityConnection, { sceneName: 'NonExistentScene' });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Scene not found'));
    });

    it('should validate that only one identifier is provided', async () => {
        const result = await getSceneInfoHandler(mockUnityConnection, {
            scenePath: 'Assets/Scenes/Test.unity',
            sceneName: 'Test'
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Provide either scenePath or sceneName, not both'));
    });

    it('should handle command timeout', async () => {
        sendCommandSpy.mock.mockImplementation(() => 
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Command timeout')), 100)
            )
        );

        const result = await getSceneInfoHandler(mockUnityConnection, {});
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Command timeout'));
    });
});
