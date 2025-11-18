import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { SceneCreateToolHandler } from '../../../src/handlers/scene/SceneCreateToolHandler.js';

describe('SceneCreateToolHandler', () => {
  let handler;
  let mockUnityConnection;
  let sendCommandSpy;

  beforeEach(() => {
    sendCommandSpy = mock.fn(() =>
      Promise.resolve({
        status: 'success',
        result: {
          sceneName: 'TestScene',
          path: 'Assets/Scenes/TestScene.unity',
          sceneIndex: -1,
          isLoaded: true,
          summary: 'Created and loaded scene "TestScene" at "Assets/Scenes/TestScene.unity"'
        }
      })
    );

    mockUnityConnection = {
      sendCommand: sendCommandSpy,
      isConnected: () => true
    };

    handler = new SceneCreateToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should have correct tool definition', () => {
    const definition = handler.getDefinition();
    assert.equal(definition.name, 'scene_create');
    assert.equal(definition.description, 'Create a new scene in Unity');
    assert.ok(definition.inputSchema);
    assert.ok(definition.inputSchema.properties.sceneName);
    assert.ok(definition.inputSchema.properties.path);
    assert.ok(definition.inputSchema.properties.loadScene);
    assert.ok(definition.inputSchema.properties.addToBuildSettings);
    assert.deepEqual(definition.inputSchema.required, ['sceneName']);
  });

  it('should handle successful scene creation with minimal parameters', async () => {
    const params = { sceneName: 'TestScene' };

    const response = await handler.handle(params);

    assert.equal(response.status, 'success');
    assert.deepEqual(response.result, {
      sceneName: 'TestScene',
      path: 'Assets/Scenes/TestScene.unity',
      sceneIndex: -1,
      isLoaded: true,
      summary: 'Created and loaded scene "TestScene" at "Assets/Scenes/TestScene.unity"'
    });

    assert.equal(sendCommandSpy.mock.calls.length, 1);
    assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'create_scene');
    assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], params);
  });

  it('should handle all parameters', async () => {
    const params = {
      sceneName: 'MyLevel',
      path: 'Assets/Levels/',
      loadScene: false,
      addToBuildSettings: true
    };

    sendCommandSpy.mock.mockImplementation(() =>
      Promise.resolve({
        status: 'success',
        result: {
          sceneName: 'MyLevel',
          path: 'Assets/Levels/MyLevel.unity',
          sceneIndex: 3,
          isLoaded: false,
          summary: 'Created scene "MyLevel" at "Assets/Levels/MyLevel.unity" (not loaded)'
        }
      })
    );

    const response = await handler.handle(params);

    assert.equal(response.status, 'success');
    assert.equal(response.result.sceneName, 'MyLevel');
    assert.equal(response.result.path, 'Assets/Levels/MyLevel.unity');
    assert.equal(response.result.sceneIndex, 3);
    assert.equal(response.result.isLoaded, false);
  });

  it('should validate missing scene name', async () => {
    const response = await handler.handle({});

    assert.equal(response.status, 'error');
    assert.equal(response.error, 'Missing required parameter: sceneName');
    assert.equal(response.code, 'TOOL_ERROR');
  });

  it('should validate empty scene name', async () => {
    const response = await handler.handle({ sceneName: '' });

    assert.equal(response.status, 'error');
    assert.equal(response.error, 'Scene name cannot be empty');
    assert.equal(response.code, 'TOOL_ERROR');
  });

  it('should validate invalid characters in scene name', async () => {
    const response = await handler.handle({ sceneName: 'Scene/With/Slashes' });

    assert.equal(response.status, 'error');
    assert.equal(response.error, 'Scene name contains invalid characters');
    assert.equal(response.code, 'TOOL_ERROR');
  });

  it('should handle Unity connection not available', async () => {
    mockUnityConnection.isConnected = () => false;

    const response = await handler.handle({ sceneName: 'TestScene' });

    assert.equal(response.status, 'error');
    assert.equal(response.error, 'Unity connection not available');
    assert.equal(response.code, 'TOOL_ERROR');
  });

  it('should handle Unity error response', async () => {
    sendCommandSpy.mock.mockImplementation(() =>
      Promise.resolve({
        status: 'error',
        error: 'Scene already exists'
      })
    );

    const response = await handler.handle({ sceneName: 'ExistingScene' });

    assert.equal(response.status, 'error');
    assert.equal(response.error, 'Scene already exists');
    assert.equal(response.code, 'UNITY_ERROR');
  });

  it('should handle command timeout', async () => {
    sendCommandSpy.mock.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Command timeout')), 10))
    );

    const response = await handler.handle({ sceneName: 'TestScene' });

    assert.equal(response.status, 'error');
    assert.equal(response.error, 'Command timeout');
    assert.equal(response.code, 'TOOL_ERROR');
  });

  it('should include parameter summary in error details', async () => {
    mockUnityConnection.isConnected = () => false;

    const response = await handler.handle({
      sceneName: 'TestScene',
      path: 'Assets/CustomScenes/',
      loadScene: true
    });

    assert.equal(response.status, 'error');
    assert.ok(response.details);
    assert.equal(response.details.tool, 'scene_create');
    assert.ok(response.details.params.includes('sceneName: "TestScene"'));
    assert.ok(response.details.params.includes('path: "Assets/CustomScenes/"'));
    assert.ok(response.details.params.includes('loadScene: true'));
  });
});
