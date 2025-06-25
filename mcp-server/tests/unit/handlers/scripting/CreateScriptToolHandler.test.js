import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CreateScriptToolHandler } from '../../../../src/handlers/scripting/CreateScriptToolHandler.js';

describe('CreateScriptToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async () => ({
        success: true,
        scriptPath: 'Assets/Scripts/TestScript.cs',
        message: 'Script created successfully'
      }))
    };
    
    handler = new CreateScriptToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'create_script');
      assert.equal(handler.description, 'Create a new C# script in Unity project');
      assert.ok(handler.inputSchema);
      assert.equal(typeof handler.execute, 'function');
    });

    it('should define required input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.scriptName);
      assert.ok(schema.properties.scriptType);
      assert.ok(schema.properties.path);
      assert.ok(schema.properties.namespace);
      assert.deepEqual(schema.required, ['scriptName']);
    });

    it('should define scriptType enum correctly', () => {
      const scriptType = handler.inputSchema.properties.scriptType;
      assert.deepEqual(scriptType.enum, [
        'MonoBehaviour',
        'ScriptableObject', 
        'Editor',
        'StaticClass',
        'Interface'
      ]);
      assert.equal(scriptType.default, 'MonoBehaviour');
    });
  });

  describe('validate', () => {
    it('should pass with valid script name', () => {
      assert.doesNotThrow(() => {
        handler.validate({ scriptName: 'PlayerController' });
      });
    });

    it('should fail with empty script name', () => {
      assert.throws(
        () => handler.validate({ scriptName: '' }),
        /scriptName cannot be empty/
      );
    });

    it('should fail with invalid script name characters', () => {
      assert.throws(
        () => handler.validate({ scriptName: 'Player Controller' }),
        /scriptName must be a valid C# class name/
      );

      assert.throws(
        () => handler.validate({ scriptName: 'Player-Controller' }),
        /scriptName must be a valid C# class name/
      );

      assert.throws(
        () => handler.validate({ scriptName: '123Player' }),
        /scriptName must be a valid C# class name/
      );
    });

    it('should validate script type enum', () => {
      assert.throws(
        () => handler.validate({ 
          scriptName: 'Test',
          scriptType: 'InvalidType' 
        }),
        /scriptType must be one of/
      );
    });

    it('should validate path format', () => {
      assert.throws(
        () => handler.validate({ 
          scriptName: 'Test',
          path: 'InvalidPath' 
        }),
        /path must start with Assets\//
      );
    });

    it('should validate namespace format', () => {
      assert.throws(
        () => handler.validate({ 
          scriptName: 'Test',
          namespace: 'Invalid Namespace' 
        }),
        /namespace must be a valid C# namespace/
      );
    });

    it('should accept valid parameters', () => {
      assert.doesNotThrow(() => {
        handler.validate({
          scriptName: 'PlayerController',
          scriptType: 'MonoBehaviour',
          path: 'Assets/Scripts/',
          namespace: 'Game.Controllers'
        });
      });
    });
  });

  describe('execute', () => {
    it('should create MonoBehaviour script with default parameters', async () => {
      const result = await handler.execute({
        scriptName: 'PlayerController'
      });

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockUnityConnection.sendCommand.mock.calls[0].arguments[0], 'create_script');
      
      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.scriptName, 'PlayerController');
      assert.equal(params.scriptType, 'MonoBehaviour');
      assert.equal(params.path, 'Assets/Scripts/');
      assert.equal(params.namespace, '');
      assert.ok(params.scriptContent.includes('public class PlayerController : MonoBehaviour'));

      assert.equal(result.scriptPath, 'Assets/Scripts/TestScript.cs');
      assert.equal(result.message, 'Script created successfully');
    });

    it('should create ScriptableObject script', async () => {
      await handler.execute({
        scriptName: 'GameSettings',
        scriptType: 'ScriptableObject'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(params.scriptContent.includes('public class GameSettings : ScriptableObject'));
      assert.ok(params.scriptContent.includes('[CreateAssetMenu'));
    });

    it('should create Editor script', async () => {
      await handler.execute({
        scriptName: 'PlayerControllerEditor',
        scriptType: 'Editor',
        path: 'Assets/Editor/'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(params.scriptContent.includes('public class PlayerControllerEditor : Editor'));
      assert.ok(params.scriptContent.includes('[CustomEditor(typeof('));
    });

    it('should create StaticClass script', async () => {
      await handler.execute({
        scriptName: 'GameUtilities',
        scriptType: 'StaticClass'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(params.scriptContent.includes('public static class GameUtilities'));
    });

    it('should create Interface script', async () => {
      await handler.execute({
        scriptName: 'IMovable',
        scriptType: 'Interface'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(params.scriptContent.includes('public interface IMovable'));
    });

    it('should include namespace when provided', async () => {
      await handler.execute({
        scriptName: 'PlayerController',
        namespace: 'Game.Controllers'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(params.scriptContent.includes('namespace Game.Controllers'));
    });

    it('should connect if not connected', async () => {
      mockUnityConnection.isConnected.mock.mockImplementation(() => false);

      await handler.execute({
        scriptName: 'TestScript'
      });

      assert.equal(mockUnityConnection.connect.mock.calls.length, 1);
    });

    it('should handle Unity connection errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => {
        throw new Error('Unity not responding');
      });

      await assert.rejects(
        () => handler.execute({ scriptName: 'TestScript' }),
        /Unity not responding/
      );
    });

    it('should handle Unity command failures', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Script already exists'
      }));

      await assert.rejects(
        () => handler.execute({ scriptName: 'TestScript' }),
        /Script already exists/
      );
    });

    it('should generate proper file path', async () => {
      await handler.execute({
        scriptName: 'PlayerController',
        path: 'Assets/Scripts/Controllers/'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.path, 'Assets/Scripts/Controllers/');
      assert.equal(params.fileName, 'PlayerController.cs');
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        scriptName: 'TestScript'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result.scriptPath);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({
        scriptName: ''
      });

      assert.equal(result.status, 'error');
      assert.ok(result.error.includes('scriptName cannot be empty'));
    });
  });
});