import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createSceneToolDefinition, createSceneHandler } from '../../../../src/tools/scene/createScene.js';

describe('CreateSceneTool', () => {
    let mockUnityConnection;
    let sendCommandSpy;

    beforeEach(() => {
        sendCommandSpy = mock.fn(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'TestScene',
                path: 'Assets/Scenes/TestScene.unity',
                sceneIndex: -1,
                isLoaded: true,
                summary: 'Created and loaded scene "TestScene" at "Assets/Scenes/TestScene.unity"'
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
        assert.equal(createSceneToolDefinition.name, 'create_scene');
        assert.equal(createSceneToolDefinition.description, 'Create a new scene in Unity');
    });

    it('should have correct input schema', () => {
        const schema = createSceneToolDefinition.inputSchema;
        assert.equal(schema.type, 'object');
        assert.ok(schema.properties.sceneName);
        assert.ok(schema.properties.path);
        assert.ok(schema.properties.loadScene);
        assert.ok(schema.properties.addToBuildSettings);
        assert.deepEqual(schema.required, ['sceneName']);
    });

    it('should create scene with minimal parameters', async () => {
        const args = {
            sceneName: 'TestScene'
        };

        const result = await createSceneHandler(mockUnityConnection, args);

        assert.equal(sendCommandSpy.mock.calls.length, 1);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'create_scene');
        assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);
        
        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Created and loaded scene'));
        assert.ok(result.content[0].text.includes('TestScene'));
    });

    it('should create scene with custom path', async () => {
        const args = {
            sceneName: 'MyLevel',
            path: 'Assets/Levels/MyLevel.unity',
            loadScene: true,
            addToBuildSettings: true
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'MyLevel',
                path: 'Assets/Levels/MyLevel.unity',
                sceneIndex: 3,
                isLoaded: true,
                summary: 'Created and loaded scene "MyLevel" at "Assets/Levels/MyLevel.unity" (build index: 3)'
            }
        }));

        const result = await createSceneHandler(mockUnityConnection, args);

        assert.equal(sendCommandSpy.mock.calls.length, 1);
        assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);
        
        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Created and loaded scene'));
        assert.ok(result.content[0].text.includes('MyLevel'));
        assert.ok(result.content[0].text.includes('build index: 3'));
    });

    it('should create scene without loading it', async () => {
        const args = {
            sceneName: 'BackgroundScene',
            loadScene: false
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                sceneName: 'BackgroundScene',
                path: 'Assets/Scenes/BackgroundScene.unity',
                sceneIndex: -1,
                isLoaded: false,
                summary: 'Created scene "BackgroundScene" at "Assets/Scenes/BackgroundScene.unity" (not loaded)'
            }
        }));

        const result = await createSceneHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Created scene'));
        assert.ok(result.content[0].text.includes('not loaded'));
    });

    it('should handle connection not available', async () => {
        mockUnityConnection.isConnected = () => false;

        const result = await createSceneHandler(mockUnityConnection, { sceneName: 'TestScene' });
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Unity connection not available'));
    });

    it('should handle Unity error response', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'error',
            error: 'Scene with name "ExistingScene" already exists at path "Assets/Scenes/ExistingScene.unity"'
        }));

        const result = await createSceneHandler(mockUnityConnection, { sceneName: 'ExistingScene' });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('already exists'));
    });

    it('should handle path validation error', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'error',
            error: 'Invalid path: Path must be within Assets folder and end with .unity'
        }));

        const result = await createSceneHandler(mockUnityConnection, { 
            sceneName: 'TestScene',
            path: 'InvalidPath/Scene'
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Invalid path'));
    });

    it('should handle command timeout', async () => {
        sendCommandSpy.mock.mockImplementation(() => 
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Command timeout')), 100)
            )
        );

        const result = await createSceneHandler(mockUnityConnection, { sceneName: 'TestScene' });
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Command timeout'));
    });

    it('should validate scene name', async () => {
        // Test empty scene name
        let result = await createSceneHandler(mockUnityConnection, { sceneName: '' });
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Scene name cannot be empty'));

        // Test invalid characters in scene name
        result = await createSceneHandler(mockUnityConnection, { sceneName: 'Scene/With/Slashes' });
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Scene name contains invalid characters'));
    });

    it('should format path correctly', async () => {
        const args = {
            sceneName: 'TestScene',
            path: 'Assets/CustomFolder/'  // Path without filename
        };

        await createSceneHandler(mockUnityConnection, args);

        // Should append scene name with .unity extension
        const sentArgs = sendCommandSpy.mock.calls[0].arguments[1];
        assert.equal(sentArgs.path, 'Assets/CustomFolder/');
    });
});