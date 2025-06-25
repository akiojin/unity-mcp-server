import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateScriptToolHandler } from '../../../../src/handlers/scripting/UpdateScriptToolHandler.js';

describe('UpdateScriptToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async () => ({
        success: true,
        scriptPath: 'Assets/Scripts/TestScript.cs',
        message: 'Script updated successfully'
      }))
    };
    
    handler = new UpdateScriptToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'update_script');
      assert.equal(handler.description, 'Update an existing C# script in Unity project');
      assert.ok(handler.inputSchema);
      assert.equal(typeof handler.execute, 'function');
    });

    it('should define required input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.scriptPath);
      assert.ok(schema.properties.scriptContent);
      assert.deepEqual(schema.required, ['scriptContent']);
    });

    it('should define alternative update methods', () => {
      const schema = handler.inputSchema;
      assert.ok(schema.properties.scriptName);
      assert.ok(schema.properties.searchPath);
      assert.ok(schema.properties.updateMode);
    });
  });

  describe('validate', () => {
    it('should pass with script path and content', () => {
      assert.doesNotThrow(() => {
        handler.validate({ 
          scriptPath: 'Assets/Scripts/PlayerController.cs',
          scriptContent: 'using UnityEngine;\n\npublic class PlayerController : MonoBehaviour\n{\n}'
        });
      });
    });

    it('should pass with script name and content', () => {
      assert.doesNotThrow(() => {
        handler.validate({ 
          scriptName: 'PlayerController',
          scriptContent: 'using UnityEngine;\n\npublic class PlayerController : MonoBehaviour\n{\n}'
        });
      });
    });

    it('should fail when scriptContent is missing', () => {
      assert.throws(
        () => handler.validate({ scriptPath: 'Assets/Scripts/Test.cs' }),
        /scriptContent is required/
      );
    });

    it('should fail when both scriptPath and scriptName are missing', () => {
      assert.throws(
        () => handler.validate({ scriptContent: 'content' }),
        /Either scriptPath or scriptName must be provided/
      );
    });

    it('should validate script path format', () => {
      assert.throws(
        () => handler.validate({ 
          scriptPath: 'InvalidPath.cs',
          scriptContent: 'content'
        }),
        /scriptPath must start with Assets\//
      );
    });

    it('should require .cs extension for scriptPath', () => {
      assert.throws(
        () => handler.validate({ 
          scriptPath: 'Assets/Scripts/Test.txt',
          scriptContent: 'content'
        }),
        /scriptPath must end with \.cs/
      );
    });

    it('should validate script name format', () => {
      assert.throws(
        () => handler.validate({ 
          scriptName: 'Invalid Name',
          scriptContent: 'content'
        }),
        /scriptName must be a valid C# class name/
      );
    });

    it('should validate search path format', () => {
      assert.throws(
        () => handler.validate({ 
          scriptName: 'TestScript',
          searchPath: 'InvalidPath',
          scriptContent: 'content'
        }),
        /searchPath must start with Assets\//
      );
    });

    it('should validate update mode enum', () => {
      assert.throws(
        () => handler.validate({ 
          scriptPath: 'Assets/Scripts/Test.cs',
          scriptContent: 'content',
          updateMode: 'InvalidMode'
        }),
        /updateMode must be one of/
      );
    });

    it('should accept valid update modes', () => {
      const validModes = ['replace', 'append', 'prepend'];
      validModes.forEach(mode => {
        assert.doesNotThrow(() => {
          handler.validate({ 
            scriptPath: 'Assets/Scripts/Test.cs',
            scriptContent: 'content',
            updateMode: mode
          });
        });
      });
    });
  });

  describe('execute', () => {
    it('should update script by path with replace mode', async () => {
      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs',
        scriptContent: 'using UnityEngine;\n\npublic class TestScript : MonoBehaviour\n{\n}'
      });

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockUnityConnection.sendCommand.mock.calls[0].arguments[0], 'update_script');
      
      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.scriptPath, 'Assets/Scripts/TestScript.cs');
      assert.equal(params.updateMode, 'replace');
      assert.ok(params.scriptContent.includes('TestScript'));

      assert.equal(result.scriptPath, 'Assets/Scripts/TestScript.cs');
      assert.equal(result.message, 'Script updated successfully');
    });

    it('should update script by name with search', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        scriptPath: 'Assets/Scripts/Controllers/PlayerController.cs',
        message: 'Script updated successfully'
      }));

      const result = await handler.execute({
        scriptName: 'PlayerController',
        searchPath: 'Assets/Scripts/',
        scriptContent: 'updated content'
      });

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.scriptName, 'PlayerController');
      assert.equal(params.searchPath, 'Assets/Scripts/');

      assert.equal(result.scriptPath, 'Assets/Scripts/Controllers/PlayerController.cs');
    });

    it('should support append mode', async () => {
      await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs',
        scriptContent: '\n    // New method\n    void NewMethod() {}\n',
        updateMode: 'append'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.updateMode, 'append');
    });

    it('should support prepend mode', async () => {
      await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs',
        scriptContent: '// Header comment\n',
        updateMode: 'prepend'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.updateMode, 'prepend');
    });

    it('should create backup when enabled', async () => {
      await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs',
        scriptContent: 'new content',
        createBackup: true
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.createBackup, true);
    });

    it('should connect if not connected', async () => {
      mockUnityConnection.isConnected.mock.mockImplementation(() => false);

      await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs',
        scriptContent: 'content'
      });

      assert.equal(mockUnityConnection.connect.mock.calls.length, 1);
    });

    it('should handle Unity connection errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => {
        throw new Error('Unity not responding');
      });

      await assert.rejects(
        () => handler.execute({ 
          scriptPath: 'Assets/Scripts/TestScript.cs',
          scriptContent: 'content'
        }),
        /Unity not responding/
      );
    });

    it('should handle script not found', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Script not found: Assets/Scripts/NonExistent.cs'
      }));

      await assert.rejects(
        () => handler.execute({ 
          scriptPath: 'Assets/Scripts/NonExistent.cs',
          scriptContent: 'content'
        }),
        /Script not found/
      );
    });

    it('should handle file write errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Permission denied writing file'
      }));

      await assert.rejects(
        () => handler.execute({ 
          scriptPath: 'Assets/Scripts/TestScript.cs',
          scriptContent: 'content'
        }),
        /Permission denied writing file/
      );
    });

    it('should handle read-only files', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'File is read-only'
      }));

      await assert.rejects(
        () => handler.execute({ 
          scriptPath: 'Assets/Scripts/TestScript.cs',
          scriptContent: 'content'
        }),
        /File is read-only/
      );
    });

    it('should include metadata in response', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        scriptPath: 'Assets/Scripts/TestScript.cs',
        message: 'Script updated successfully',
        linesChanged: 15,
        backupPath: 'Assets/Scripts/TestScript.cs.backup'
      }));

      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs',
        scriptContent: 'content',
        createBackup: true
      });

      assert.equal(result.linesChanged, 15);
      assert.equal(result.backupPath, 'Assets/Scripts/TestScript.cs.backup');
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        scriptPath: 'Assets/Scripts/TestScript.cs',
        scriptContent: 'using UnityEngine;\n\npublic class TestScript : MonoBehaviour\n{\n}'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result.scriptPath);
      assert.ok(result.result.message);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({
        scriptPath: 'Assets/Scripts/TestScript.cs'
        // Missing scriptContent
      });

      assert.equal(result.status, 'error');
      assert.ok(result.error.includes('scriptContent is required'));
    });
  });
});