import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveSceneToolDefinition,
  saveSceneHandler
} from '../../../../src/tools/scene/saveScene.js';

describe('SaveSceneTool', () => {
  let mockUnityConnection;
  let sendCommandSpy;

  beforeEach(() => {
    sendCommandSpy = mock.fn(() =>
      Promise.resolve({
        status: 'success',
        result: {
          sceneName: 'MainMenu',
          scenePath: 'Assets/Scenes/MainMenu.unity',
          saved: true,
          isDirty: false,
          summary: 'Saved scene "MainMenu" to "Assets/Scenes/MainMenu.unity"'
        }
      })
    );

    mockUnityConnection = {
      sendCommand: sendCommandSpy,
      isConnected: () => true
    };
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should have correct tool definition', () => {
    assert.equal(saveSceneToolDefinition.name, 'scene_save');
    assert.equal(saveSceneToolDefinition.description, 'Save the current scene in Unity');
  });

  it('should have correct input schema', () => {
    const schema = saveSceneToolDefinition.inputSchema;
    assert.equal(schema.type, 'object');
    assert.ok(schema.properties.scenePath);
    assert.ok(schema.properties.saveAs);
    assert.deepEqual(schema.required, []);
  });

  it('should save current scene without parameters', async () => {
    const args = {};

    const result = await saveSceneHandler(mockUnityConnection, args);

    assert.equal(sendCommandSpy.mock.calls.length, 1);
    assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'scene_save');
    assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);

    assert.equal(result.isError, false);
    assert.ok(result.content[0].text.includes('Saved scene'));
    assert.ok(result.content[0].text.includes('MainMenu'));
  });

  it('should save scene to specific path', async () => {
    const args = {
      scenePath: 'Assets/Levels/Level1_Backup.unity'
    };

    sendCommandSpy.mock.mockImplementation(() =>
      Promise.resolve({
        status: 'success',
        result: {
          sceneName: 'Level1',
          scenePath: 'Assets/Levels/Level1_Backup.unity',
          saved: true,
          isDirty: false,
          summary: 'Saved scene "Level1" to "Assets/Levels/Level1_Backup.unity"'
        }
      })
    );

    const result = await saveSceneHandler(mockUnityConnection, args);

    assert.equal(result.isError, false);
    assert.ok(result.content[0].text.includes('Level1_Backup.unity'));
  });

  it('should save as new scene', async () => {
    const args = {
      saveAs: true,
      scenePath: 'Assets/Scenes/MainMenu_Copy.unity'
    };

    sendCommandSpy.mock.mockImplementation(() =>
      Promise.resolve({
        status: 'success',
        result: {
          sceneName: 'MainMenu',
          scenePath: 'Assets/Scenes/MainMenu_Copy.unity',
          originalPath: 'Assets/Scenes/MainMenu.unity',
          saved: true,
          isDirty: false,
          summary: 'Saved scene "MainMenu" as "Assets/Scenes/MainMenu_Copy.unity"'
        }
      })
    );

    const result = await saveSceneHandler(mockUnityConnection, args);

    assert.equal(result.isError, false);
    assert.ok(result.content[0].text.includes('Saved scene'));
    assert.ok(result.content[0].text.includes('MainMenu_Copy.unity'));
  });

  it('should handle scene not dirty', async () => {
    sendCommandSpy.mock.mockImplementation(() =>
      Promise.resolve({
        status: 'success',
        result: {
          sceneName: 'MainMenu',
          scenePath: 'Assets/Scenes/MainMenu.unity',
          saved: false,
          isDirty: false,
          summary: 'Scene "MainMenu" has no unsaved changes'
        }
      })
    );

    const result = await saveSceneHandler(mockUnityConnection, {});

    assert.equal(result.isError, false);
    assert.ok(result.content[0].text.includes('no unsaved changes'));
  });

  it('should handle connection not available', async () => {
    mockUnityConnection.isConnected = () => false;

    const result = await saveSceneHandler(mockUnityConnection, {});

    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('Unity connection not available'));
  });

  it('should handle no scene loaded error', async () => {
    sendCommandSpy.mock.mockImplementation(() =>
      Promise.resolve({
        status: 'error',
        error: 'No scene is currently loaded'
      })
    );

    const result = await saveSceneHandler(mockUnityConnection, {});

    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('No scene is currently loaded'));
  });

  it('should handle invalid path error', async () => {
    sendCommandSpy.mock.mockImplementation(() =>
      Promise.resolve({
        status: 'error',
        error: 'Invalid path: Path must be within Assets folder and end with .unity'
      })
    );

    const result = await saveSceneHandler(mockUnityConnection, {
      scenePath: '../InvalidPath/Scene.unity'
    });

    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('Invalid path'));
  });

  it('should handle save failure', async () => {
    sendCommandSpy.mock.mockImplementation(() =>
      Promise.resolve({
        status: 'error',
        error: 'Failed to save scene: Access denied'
      })
    );

    const result = await saveSceneHandler(mockUnityConnection, {});

    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('Failed to save scene'));
  });

  it('should validate saveAs requires scenePath', async () => {
    const result = await saveSceneHandler(mockUnityConnection, {
      saveAs: true
    });

    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('scenePath is required when saveAs is true'));
  });

  it('should handle command timeout', async () => {
    sendCommandSpy.mock.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Command timeout')), 100))
    );

    const result = await saveSceneHandler(mockUnityConnection, {});

    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('Command timeout'));
  });
});
