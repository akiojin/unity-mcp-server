import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { SaveSceneToolHandler } from '../../../src/handlers/scene/SaveSceneToolHandler.js';

describe('SaveSceneToolHandler', () => {
  let handler;
  let mockUnityConnection;
  let sendCommandSpy;

  beforeEach(() => {
    sendCommandSpy = mock.fn(() => Promise.resolve({
      status: 'success',
      result: {
        sceneName: 'MainMenu',
        scenePath: 'Assets/Scenes/MainMenu.unity',
        saved: true,
        isDirty: false,
        summary: 'Saved scene "MainMenu" to "Assets/Scenes/MainMenu.unity"'
      }
    }));

    mockUnityConnection = {
      sendCommand: sendCommandSpy,
      isConnected: () => true
    };

    handler = new SaveSceneToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should have correct tool definition', () => {
    const definition = handler.getDefinition();
    assert.equal(definition.name, 'save_scene');
    assert.equal(definition.description, 'Save the current scene in Unity');
    assert.ok(definition.inputSchema);
    assert.ok(definition.inputSchema.properties.scenePath);
    assert.ok(definition.inputSchema.properties.saveAs);
    assert.deepEqual(definition.inputSchema.required, []);
  });

  it('should handle successful scene save', async () => {
    const params = {};
    
    const response = await handler.handle(params);
    
    assert.equal(response.status, 'success');
    assert.deepEqual(response.result, {
      sceneName: 'MainMenu',
      scenePath: 'Assets/Scenes/MainMenu.unity',
      saved: true,
      isDirty: false,
      summary: 'Saved scene "MainMenu" to "Assets/Scenes/MainMenu.unity"'
    });
    
    assert.equal(sendCommandSpy.mock.calls.length, 1);
    assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'save_scene');
    assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], params);
  });

  it('should handle save as', async () => {
    const params = { 
      saveAs: true,
      scenePath: 'Assets/Scenes/MainMenu_Copy.unity'
    };
    
    const response = await handler.handle(params);
    
    assert.equal(response.status, 'success');
  });

  it('should validate saveAs requires scenePath', async () => {
    const response = await handler.handle({ saveAs: true });
    
    assert.equal(response.status, 'error');
    assert.equal(response.error, 'scenePath is required when saveAs is true');
    assert.equal(response.code, 'TOOL_ERROR');
  });

  it('should handle Unity connection not available', async () => {
    mockUnityConnection.isConnected = () => false;
    
    const response = await handler.handle({});
    
    assert.equal(response.status, 'error');
    assert.equal(response.error, 'Unity connection not available');
    assert.equal(response.code, 'TOOL_ERROR');
  });

  it('should handle Unity error response', async () => {
    sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
      status: 'error',
      error: 'No scene is currently loaded'
    }));
    
    const response = await handler.handle({});
    
    assert.equal(response.status, 'error');
    assert.equal(response.error, 'No scene is currently loaded');
    assert.equal(response.code, 'UNITY_ERROR');
  });
});