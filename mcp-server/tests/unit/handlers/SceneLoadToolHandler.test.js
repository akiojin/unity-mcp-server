import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { SceneLoadToolHandler } from '../../../src/handlers/scene/SceneLoadToolHandler.js';

describe('SceneLoadToolHandler', () => {
  let handler;
  let mockUnityConnection;
  let sendCommandSpy;

  beforeEach(() => {
    sendCommandSpy = mock.fn(() =>
      Promise.resolve({
        sceneName: 'MainMenu',
        scenePath: 'Assets/Scenes/MainMenu.unity',
        loadMode: 'Single',
        isLoaded: true,
        previousScene: 'SampleScene',
        summary: 'Loaded scene "MainMenu" in Single mode'
      })
    );

    mockUnityConnection = {
      sendCommand: sendCommandSpy,
      isConnected: () => true
    };

    handler = new SceneLoadToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should have correct tool definition', () => {
    const definition = handler.getDefinition();
    assert.equal(definition.name, 'scene_load');
    assert.equal(definition.description, 'Load a scene by path or name (Single/Additive).');
    assert.ok(definition.inputSchema);
    assert.ok(definition.inputSchema.properties.scenePath);
    assert.ok(definition.inputSchema.properties.sceneName);
    assert.ok(definition.inputSchema.properties.loadMode);
    assert.equal(definition.inputSchema.required, undefined);
  });

  it('should handle successful scene load by path', async () => {
    const params = { scenePath: 'Assets/Scenes/MainMenu.unity' };

    const response = await handler.handle(params);

    assert.equal(response.status, 'success');
    assert.deepEqual(response.result, {
      sceneName: 'MainMenu',
      scenePath: 'Assets/Scenes/MainMenu.unity',
      loadMode: 'Single',
      isLoaded: true,
      previousScene: 'SampleScene',
      summary: 'Loaded scene "MainMenu" in Single mode'
    });

    assert.equal(sendCommandSpy.mock.calls.length, 1);
    assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'load_scene');
    assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], params);
  });

  it('should handle scene load by name', async () => {
    const params = { sceneName: 'Level1' };

    sendCommandSpy.mock.mockImplementation(() =>
      Promise.resolve({
        sceneName: 'Level1',
        scenePath: 'Assets/Levels/Level1.unity',
        loadMode: 'Single',
        isLoaded: true,
        previousScene: 'MainMenu',
        summary: 'Loaded scene "Level1" in Single mode'
      })
    );

    const response = await handler.handle(params);

    assert.equal(response.status, 'success');
    assert.equal(response.result.sceneName, 'Level1');
  });

  it('should handle additive load mode', async () => {
    const params = {
      sceneName: 'UI_Overlay',
      loadMode: 'Additive'
    };

    const response = await handler.handle(params);

    assert.equal(sendCommandSpy.mock.calls[0].arguments[1].loadMode, 'Additive');
  });

  it('should validate missing both parameters', async () => {
    const response = await handler.handle({});

    assert.equal(response.status, 'error');
    assert.equal(response.error, 'Either scenePath or sceneName must be provided');
    assert.equal(response.code, 'TOOL_ERROR');
  });

  it('should validate both parameters provided', async () => {
    const response = await handler.handle({
      scenePath: 'Assets/Scenes/Test.unity',
      sceneName: 'Test'
    });

    assert.equal(response.status, 'error');
    assert.equal(response.error, 'Provide either scenePath or sceneName, not both');
    assert.equal(response.code, 'TOOL_ERROR');
  });

  it('should validate invalid load mode', async () => {
    const response = await handler.handle({
      sceneName: 'Test',
      loadMode: 'InvalidMode'
    });

    assert.equal(response.status, 'error');
    assert.equal(response.error, 'Invalid load mode. Must be "Single" or "Additive"');
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
        error: 'Scene not found'
      })
    );

    const response = await handler.handle({ sceneName: 'NonExistent' });

    assert.equal(response.status, 'error');
    assert.equal(response.error, 'Scene not found');
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
      scenePath: 'Assets/Scenes/MainMenu.unity',
      loadMode: 'Single'
    });

    assert.equal(response.status, 'error');
    assert.ok(response.details);
    assert.equal(response.details.tool, 'scene_load');
    assert.ok(response.details.params.includes('scenePath'));
    assert.ok(response.details.params.includes('loadMode: "Single"'));
  });

  it('should handle Unity returning undefined result (reproduces union error)', async () => {
    // This test reproduces the union error where Unity returns success but undefined result
    sendCommandSpy.mock.mockImplementation(() => Promise.resolve(undefined));

    const response = await handler.handle({ sceneName: 'TestScene' });

    // The handler should still return success status
    assert.equal(response.status, 'success');
    // But result should be properly handled (not undefined)
    assert.ok(response.result !== undefined);
    // Should provide meaningful information even when Unity returns undefined
    assert.ok(typeof response.result === 'object');
  });

  it('should handle Unity returning null result', async () => {
    sendCommandSpy.mock.mockImplementation(() => Promise.resolve(null));

    const response = await handler.handle({ sceneName: 'TestScene' });

    assert.equal(response.status, 'success');
    assert.ok(response.result !== null);
    assert.ok(typeof response.result === 'object');
  });
});
