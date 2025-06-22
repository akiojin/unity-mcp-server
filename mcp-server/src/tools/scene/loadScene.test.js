import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { loadSceneToolDefinition, loadSceneHandler } from './loadScene.js';

describe('LoadSceneTool', () => {
    let mockUnityConnection;
    let sendCommandSpy;

    beforeEach(() => {
        sendCommandSpy = mock.fn(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'MainMenu',
                scenePath: 'Assets/Scenes/MainMenu.unity',
                loadMode: 'Single',
                isLoaded: true,
                previousScene: 'SampleScene',
                summary: 'Loaded scene "MainMenu" in Single mode'
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
        assert.equal(loadSceneToolDefinition.name, 'load_scene');
        assert.equal(loadSceneToolDefinition.description, 'Load a scene in Unity');
    });

    it('should have correct input schema', () => {
        const schema = loadSceneToolDefinition.inputSchema;
        assert.equal(schema.type, 'object');
        assert.ok(schema.properties.scenePath);
        assert.ok(schema.properties.sceneName);
        assert.ok(schema.properties.loadMode);
        assert.deepEqual(schema.required, []);
        
        // Check load modes
        const loadModes = schema.properties.loadMode.enum;
        assert.ok(loadModes.includes('Single'));
        assert.ok(loadModes.includes('Additive'));
    });

    it('should load scene by path', async () => {
        const args = {
            scenePath: 'Assets/Scenes/MainMenu.unity'
        };

        const result = await loadSceneHandler(mockUnityConnection, args);

        assert.equal(sendCommandSpy.mock.calls.length, 1);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'load_scene');
        assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);
        
        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Loaded scene'));
        assert.ok(result.content[0].text.includes('MainMenu'));
    });

    it('should load scene by name', async () => {
        const args = {
            sceneName: 'Level1'
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'Level1',
                scenePath: 'Assets/Levels/Level1.unity',
                loadMode: 'Single',
                isLoaded: true,
                previousScene: 'MainMenu',
                summary: 'Loaded scene "Level1" in Single mode'
            }
        }));

        const result = await loadSceneHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Loaded scene'));
        assert.ok(result.content[0].text.includes('Level1'));
    });

    it('should load scene additively', async () => {
        const args = {
            sceneName: 'UI_Overlay',
            loadMode: 'Additive'
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'UI_Overlay',
                scenePath: 'Assets/UI/UI_Overlay.unity',
                loadMode: 'Additive',
                isLoaded: true,
                activeSceneCount: 2,
                summary: 'Loaded scene "UI_Overlay" in Additive mode (2 scenes active)'
            }
        }));

        const result = await loadSceneHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Additive mode'));
        assert.ok(result.content[0].text.includes('2 scenes active'));
    });

    it('should handle connection not available', async () => {
        mockUnityConnection.isConnected = () => false;

        const result = await loadSceneHandler(mockUnityConnection, { sceneName: 'TestScene' });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Unity connection not available'));
    });

    it('should handle scene not found error', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'error',
            error: 'Scene not found: NonExistentScene'
        }));

        const result = await loadSceneHandler(mockUnityConnection, { sceneName: 'NonExistentScene' });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Scene not found'));
    });

    it('should handle scene not in build settings error', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'error',
            error: 'Scene "TestScene" is not in build settings. Add it to build settings or load by path.'
        }));

        const result = await loadSceneHandler(mockUnityConnection, { sceneName: 'TestScene' });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('not in build settings'));
    });

    it('should validate that either scenePath or sceneName is provided', async () => {
        const result = await loadSceneHandler(mockUnityConnection, {});
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Either scenePath or sceneName must be provided'));
    });

    it('should validate that only one of scenePath or sceneName is provided', async () => {
        const result = await loadSceneHandler(mockUnityConnection, {
            scenePath: 'Assets/Scenes/Test.unity',
            sceneName: 'Test'
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Provide either scenePath or sceneName, not both'));
    });

    it('should validate load mode values', async () => {
        const result = await loadSceneHandler(mockUnityConnection, {
            sceneName: 'Test',
            loadMode: 'InvalidMode'
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Invalid load mode'));
    });

    it('should handle command timeout', async () => {
        sendCommandSpy.mock.mockImplementation(() => 
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Command timeout')), 100)
            )
        );

        const result = await loadSceneHandler(mockUnityConnection, { sceneName: 'TestScene' });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Command timeout'));
    });
});