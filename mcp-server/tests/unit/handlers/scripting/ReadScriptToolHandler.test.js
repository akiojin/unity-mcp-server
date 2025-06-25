import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ReadScriptToolHandler } from '../../../../src/handlers/scripting/ReadScriptToolHandler.js';

describe('ReadScriptToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async () => ({
        success: true,
        scriptContent: 'using UnityEngine;\n\npublic class TestScript : MonoBehaviour\n{\n    void Start()\n    {\n        \n    }\n}',
        scriptPath: 'Assets/Scripts/TestScript.cs',
        lastModified: '2025-01-24T10:00:00Z'
      }))
    };
    
    handler = new ReadScriptToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'read_script');
      assert.equal(handler.description, 'Read the contents of a C# script file');
      assert.ok(handler.inputSchema);
      assert.equal(typeof handler.execute, 'function');
    });

    it('should define required input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.scriptPath);
      assert.deepEqual(schema.required, []);
    });

    it('should define alternative input method with scriptName', () => {
      const schema = handler.inputSchema;
      assert.ok(schema.properties.scriptName);
      assert.ok(schema.properties.searchPath);
    });
  });

  describe('validate', () => {
    it('should pass with valid script path', () => {
      assert.doesNotThrow(() => {
        handler.validate({ scriptPath: 'Assets/Scripts/PlayerController.cs' });
      });
    });

    it('should pass with script name and search path', () => {
      assert.doesNotThrow(() => {
        handler.validate({ 
          scriptName: 'PlayerController',
          searchPath: 'Assets/Scripts/'
        });
      });
    });

    it('should fail when both scriptPath and scriptName are missing', () => {
      assert.throws(
        () => handler.validate({}),
        /Either scriptPath or scriptName must be provided/
      );
    });

    it('should validate script path format', () => {
      assert.throws(
        () => handler.validate({ scriptPath: 'InvalidPath.cs' }),
        /scriptPath must start with Assets\//
      );
    });

    it('should require .cs extension for scriptPath', () => {
      assert.throws(
        () => handler.validate({ scriptPath: 'Assets/Scripts/Test.txt' }),
        /scriptPath must end with \.cs/
      );
    });

    it('should validate script name format', () => {
      assert.throws(
        () => handler.validate({ 
          scriptName: 'Invalid Name',
          searchPath: 'Assets/Scripts/'
        }),
        /scriptName must be a valid C# class name/
      );
    });

    it('should validate search path format', () => {
      assert.throws(
        () => handler.validate({ 
          scriptName: 'TestScript',
          searchPath: 'InvalidPath'
        }),
        /searchPath must start with Assets\//
      );
    });
  });

  describe('execute', () => {
    it('should read script by path', async () => {
      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs'
      });

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockUnityConnection.sendCommand.mock.calls[0].arguments[0], 'read_script');
      
      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.scriptPath, 'Assets/Scripts/TestScript.cs');

      assert.equal(result.scriptContent, mockUnityConnection.sendCommand.mock.calls[0].arguments[1].scriptContent || 'using UnityEngine;\n\npublic class TestScript : MonoBehaviour\n{\n    void Start()\n    {\n        \n    }\n}');
      assert.equal(result.scriptPath, 'Assets/Scripts/TestScript.cs');
    });

    it('should read script by name with search', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        scriptContent: 'using UnityEngine;\n\npublic class PlayerController : MonoBehaviour\n{\n}',
        scriptPath: 'Assets/Scripts/Controllers/PlayerController.cs',
        lastModified: '2025-01-24T10:00:00Z'
      }));

      const result = await handler.execute({
        scriptName: 'PlayerController',
        searchPath: 'Assets/Scripts/'
      });

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.scriptName, 'PlayerController');
      assert.equal(params.searchPath, 'Assets/Scripts/');

      assert.ok(result.scriptContent.includes('PlayerController'));
      assert.equal(result.scriptPath, 'Assets/Scripts/Controllers/PlayerController.cs');
    });

    it('should include metadata in response', async () => {
      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs'
      });

      assert.ok(result.lastModified);
      assert.equal(result.scriptPath, 'Assets/Scripts/TestScript.cs');
    });

    it('should connect if not connected', async () => {
      mockUnityConnection.isConnected.mock.mockImplementation(() => false);

      await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs'
      });

      assert.equal(mockUnityConnection.connect.mock.calls.length, 1);
    });

    it('should handle Unity connection errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => {
        throw new Error('Unity not responding');
      });

      await assert.rejects(
        () => handler.execute({ scriptPath: 'Assets/Scripts/TestScript.cs' }),
        /Unity not responding/
      );
    });

    it('should handle script not found', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Script not found: Assets/Scripts/NonExistent.cs'
      }));

      await assert.rejects(
        () => handler.execute({ scriptPath: 'Assets/Scripts/NonExistent.cs' }),
        /Script not found/
      );
    });

    it('should handle file read errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Permission denied reading file'
      }));

      await assert.rejects(
        () => handler.execute({ scriptPath: 'Assets/Scripts/TestScript.cs' }),
        /Permission denied reading file/
      );
    });

    it('should include line count in metadata', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        scriptContent: 'line1\nline2\nline3\n',
        scriptPath: 'Assets/Scripts/TestScript.cs',
        lastModified: '2025-01-24T10:00:00Z',
        lineCount: 3,
        fileSize: 21
      }));

      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs'
      });

      assert.equal(result.lineCount, 3);
      assert.equal(result.fileSize, 21);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        scriptPath: 'Assets/Scripts/TestScript.cs'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result.scriptContent);
      assert.ok(result.result.scriptPath);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({});

      assert.equal(result.status, 'error');
      assert.ok(result.error.includes('Either scriptPath or scriptName must be provided'));
    });
  });
});