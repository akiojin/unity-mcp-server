import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteScriptToolHandler } from '../../../../src/handlers/scripting/DeleteScriptToolHandler.js';

describe('DeleteScriptToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async () => ({
        success: true,
        scriptPath: 'Assets/Scripts/TestScript.cs',
        message: 'Script deleted successfully'
      }))
    };
    
    handler = new DeleteScriptToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'delete_script');
      assert.equal(handler.description, 'Delete a C# script from Unity project');
      assert.ok(handler.inputSchema);
      assert.equal(typeof handler.execute, 'function');
    });

    it('should define required input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.scriptPath);
      assert.deepEqual(schema.required, []);
    });

    it('should define alternative deletion methods', () => {
      const schema = handler.inputSchema;
      assert.ok(schema.properties.scriptName);
      assert.ok(schema.properties.searchPath);
      assert.ok(schema.properties.createBackup);
      assert.ok(schema.properties.force);
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

    it('should accept boolean flags', () => {
      assert.doesNotThrow(() => {
        handler.validate({ 
          scriptPath: 'Assets/Scripts/Test.cs',
          createBackup: true,
          force: false
        });
      });
    });
  });

  describe('execute', () => {
    it('should delete script by path', async () => {
      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs'
      });

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockUnityConnection.sendCommand.mock.calls[0].arguments[0], 'delete_script');
      
      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.scriptPath, 'Assets/Scripts/TestScript.cs');
      assert.equal(params.createBackup, false);
      assert.equal(params.force, false);

      assert.equal(result.scriptPath, 'Assets/Scripts/TestScript.cs');
      assert.equal(result.message, 'Script deleted successfully');
    });

    it('should delete script by name with search', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        scriptPath: 'Assets/Scripts/Controllers/PlayerController.cs',
        message: 'Script deleted successfully'
      }));

      const result = await handler.execute({
        scriptName: 'PlayerController',
        searchPath: 'Assets/Scripts/'
      });

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.scriptName, 'PlayerController');
      assert.equal(params.searchPath, 'Assets/Scripts/');

      assert.equal(result.scriptPath, 'Assets/Scripts/Controllers/PlayerController.cs');
    });

    it('should create backup when enabled', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        scriptPath: 'Assets/Scripts/TestScript.cs',
        message: 'Script deleted successfully',
        backupPath: 'Assets/Scripts/TestScript.cs.backup'
      }));

      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs',
        createBackup: true
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.createBackup, true);
      assert.equal(result.backupPath, 'Assets/Scripts/TestScript.cs.backup');
    });

    it('should force delete when enabled', async () => {
      await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs',
        force: true
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.force, true);
    });

    it('should handle multiple scripts with same name', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        deletedPaths: [
          'Assets/Scripts/PlayerController.cs',
          'Assets/Scripts/UI/PlayerController.cs'
        ],
        message: 'Multiple scripts deleted successfully'
      }));

      const result = await handler.execute({
        scriptName: 'PlayerController',
        searchPath: 'Assets/'
      });

      assert.ok(Array.isArray(result.deletedPaths));
      assert.equal(result.deletedPaths.length, 2);
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

    it('should handle file access errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Permission denied deleting file'
      }));

      await assert.rejects(
        () => handler.execute({ scriptPath: 'Assets/Scripts/TestScript.cs' }),
        /Permission denied deleting file/
      );
    });

    it('should handle file in use errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'File is currently in use'
      }));

      await assert.rejects(
        () => handler.execute({ scriptPath: 'Assets/Scripts/TestScript.cs' }),
        /File is currently in use/
      );
    });

    it('should include deletion statistics', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        scriptPath: 'Assets/Scripts/TestScript.cs',
        message: 'Script deleted successfully',
        fileSize: 1024,
        lastModified: '2025-01-24T10:00:00Z'
      }));

      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs'
      });

      assert.equal(result.fileSize, 1024);
      assert.equal(result.lastModified, '2025-01-24T10:00:00Z');
    });

    it('should confirm deletion without force flag', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Deletion requires confirmation',
        requiresConfirmation: true
      }));

      await assert.rejects(
        () => handler.execute({ scriptPath: 'Assets/Scripts/TestScript.cs' }),
        /Deletion requires confirmation/
      );
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        scriptPath: 'Assets/Scripts/TestScript.cs'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result.scriptPath);
      assert.ok(result.result.message);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({});

      assert.equal(result.status, 'error');
      assert.ok(result.error.includes('Either scriptPath or scriptName must be provided'));
    });
  });
});