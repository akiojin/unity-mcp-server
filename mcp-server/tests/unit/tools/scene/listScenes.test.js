import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { listScenesToolDefinition, listScenesHandler } from '../../../../src/tools/scene/listScenes.js';

describe('ListScenesTool', () => {
    let mockUnityConnection;
    let sendCommandSpy;

    beforeEach(() => {
        sendCommandSpy = mock.fn(() => Promise.resolve({
            status: 'success',
            result: {
                scenes: [
                    {
                        name: 'MainMenu',
                        path: 'Assets/Scenes/MainMenu.unity',
                        buildIndex: 0,
                        isLoaded: true,
                        isActive: true
                    },
                    {
                        name: 'Level1',
                        path: 'Assets/Levels/Level1.unity',
                        buildIndex: 1,
                        isLoaded: false,
                        isActive: false
                    },
                    {
                        name: 'TestScene',
                        path: 'Assets/Scenes/TestScene.unity',
                        buildIndex: -1,
                        isLoaded: false,
                        isActive: false
                    }
                ],
                totalCount: 3,
                loadedCount: 1,
                inBuildCount: 2,
                summary: 'Found 3 scenes (1 loaded, 2 in build settings)'
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
        assert.equal(listScenesToolDefinition.name, 'list_scenes');
        assert.equal(listScenesToolDefinition.description, 'List all scenes in the Unity project');
    });

    it('should have correct input schema', () => {
        const schema = listScenesToolDefinition.inputSchema;
        assert.equal(schema.type, 'object');
        assert.ok(schema.properties.includeLoadedOnly);
        assert.ok(schema.properties.includeBuildScenesOnly);
        assert.ok(schema.properties.includePath);
        assert.deepEqual(schema.required, []);
    });

    it('should list all scenes without filters', async () => {
        const args = {};

        const result = await listScenesHandler(mockUnityConnection, args);

        assert.equal(sendCommandSpy.mock.calls.length, 1);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'list_scenes');
        assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);
        
        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Found 3 scenes'));
        assert.ok(result.content[0].text.includes('1 loaded'));
        assert.ok(result.content[0].text.includes('2 in build settings'));
    });

    it('should filter loaded scenes only', async () => {
        const args = {
            includeLoadedOnly: true
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                scenes: [
                    {
                        name: 'MainMenu',
                        path: 'Assets/Scenes/MainMenu.unity',
                        buildIndex: 0,
                        isLoaded: true,
                        isActive: true
                    }
                ],
                totalCount: 1,
                loadedCount: 1,
                inBuildCount: 1,
                summary: 'Found 1 loaded scene'
            }
        }));

        const result = await listScenesHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Found 1 loaded scene'));
    });

    it('should filter build scenes only', async () => {
        const args = {
            includeBuildScenesOnly: true
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                scenes: [
                    {
                        name: 'MainMenu',
                        path: 'Assets/Scenes/MainMenu.unity',
                        buildIndex: 0,
                        isLoaded: true,
                        isActive: true
                    },
                    {
                        name: 'Level1',
                        path: 'Assets/Levels/Level1.unity',
                        buildIndex: 1,
                        isLoaded: false,
                        isActive: false
                    }
                ],
                totalCount: 2,
                loadedCount: 1,
                inBuildCount: 2,
                summary: 'Found 2 scenes in build settings'
            }
        }));

        const result = await listScenesHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Found 2 scenes in build settings'));
    });

    it('should filter by path pattern', async () => {
        const args = {
            includePath: 'Levels'
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                scenes: [
                    {
                        name: 'Level1',
                        path: 'Assets/Levels/Level1.unity',
                        buildIndex: 1,
                        isLoaded: false,
                        isActive: false
                    }
                ],
                totalCount: 1,
                loadedCount: 0,
                inBuildCount: 1,
                summary: 'Found 1 scene matching path "Levels"'
            }
        }));

        const result = await listScenesHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Found 1 scene matching path'));
    });

    it('should handle connection not available', async () => {
        mockUnityConnection.isConnected = () => false;

        const result = await listScenesHandler(mockUnityConnection, {});
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Unity connection not available'));
    });

    it('should handle no scenes found', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                scenes: [],
                totalCount: 0,
                loadedCount: 0,
                inBuildCount: 0,
                summary: 'No scenes found'
            }
        }));

        const result = await listScenesHandler(mockUnityConnection, {});
        
        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('No scenes found'));
    });

    it('should handle command timeout', async () => {
        sendCommandSpy.mock.mockImplementation(() => 
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Command timeout')), 100)
            )
        );

        const result = await listScenesHandler(mockUnityConnection, {});
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Command timeout'));
    });
});