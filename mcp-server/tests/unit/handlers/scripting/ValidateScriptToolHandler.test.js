import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ValidateScriptToolHandler } from '../../../../src/handlers/scripting/ValidateScriptToolHandler.js';

describe('ValidateScriptToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async () => ({
        success: true,
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        message: 'Script validation completed successfully'
      }))
    };
    
    handler = new ValidateScriptToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'validate_script');
      assert.equal(handler.description, 'Validate a C# script for syntax and Unity compatibility');
      assert.ok(handler.inputSchema);
      assert.equal(typeof handler.execute, 'function');
    });

    it('should define required input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.scriptPath);
      assert.ok(schema.properties.scriptContent);
      assert.deepEqual(schema.required, []);
    });

    it('should define validation options', () => {
      const schema = handler.inputSchema;
      assert.ok(schema.properties.scriptName);
      assert.ok(schema.properties.searchPath);
      assert.ok(schema.properties.checkSyntax);
      assert.ok(schema.properties.checkUnityCompatibility);
      assert.ok(schema.properties.suggestImprovements);
    });
  });

  describe('validate', () => {
    it('should pass with script path only', () => {
      assert.doesNotThrow(() => {
        handler.validate({ scriptPath: 'Assets/Scripts/PlayerController.cs' });
      });
    });

    it('should pass with script content only', () => {
      assert.doesNotThrow(() => {
        handler.validate({ 
          scriptContent: 'using UnityEngine;\n\npublic class Test : MonoBehaviour\n{\n}'
        });
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

    it('should fail when no input is provided', () => {
      assert.throws(
        () => handler.validate({}),
        /Either scriptPath, scriptContent, or scriptName must be provided/
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

    it('should accept boolean validation flags', () => {
      assert.doesNotThrow(() => {
        handler.validate({ 
          scriptPath: 'Assets/Scripts/Test.cs',
          checkSyntax: true,
          checkUnityCompatibility: false,
          suggestImprovements: true
        });
      });
    });
  });

  describe('execute', () => {
    it('should validate script by path', async () => {
      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs'
      });

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockUnityConnection.sendCommand.mock.calls[0].arguments[0], 'validate_script');
      
      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.scriptPath, 'Assets/Scripts/TestScript.cs');
      // These should be undefined as no defaults are applied in execute
      assert.equal(params.checkSyntax, undefined);
      assert.equal(params.checkUnityCompatibility, undefined);
      assert.equal(params.suggestImprovements, undefined);

      assert.equal(result.isValid, true);
      assert.ok(Array.isArray(result.errors));
      assert.ok(Array.isArray(result.warnings));
      assert.equal(result.message, 'Script validation completed successfully');
    });

    it('should validate script content directly', async () => {
      const scriptContent = 'using UnityEngine;\n\npublic class TestScript : MonoBehaviour\n{\n    void Start()\n    {\n        Debug.Log("Hello World");\n    }\n}';
      
      await handler.execute({
        scriptContent
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.scriptContent, scriptContent);
    });

    it('should validate script by name with search', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        isValid: true,
        scriptPath: 'Assets/Scripts/Controllers/PlayerController.cs',
        errors: [],
        warnings: [],
        message: 'Script validation completed successfully'
      }));

      const result = await handler.execute({
        scriptName: 'PlayerController',
        searchPath: 'Assets/Scripts/'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.scriptName, 'PlayerController');
      assert.equal(params.searchPath, 'Assets/Scripts/');
      assert.equal(result.scriptPath, 'Assets/Scripts/Controllers/PlayerController.cs');
    });

    it('should handle script with syntax errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        isValid: false,
        errors: [
          {
            type: 'SyntaxError',
            line: 5,
            column: 12,
            message: 'Missing semicolon',
            severity: 'Error'
          }
        ],
        warnings: [],
        suggestions: [],
        message: 'Script validation completed with errors'
      }));

      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/BuggyScript.cs'
      });

      assert.equal(result.isValid, false);
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0].type, 'SyntaxError');
      assert.equal(result.errors[0].line, 5);
    });

    it('should handle script with warnings', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        isValid: true,
        errors: [],
        warnings: [
          {
            type: 'UnusedVariable',
            line: 8,
            column: 9,
            message: 'Variable "temp" is declared but never used',
            severity: 'Warning'
          }
        ],
        suggestions: [],
        message: 'Script validation completed with warnings'
      }));

      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs'
      });

      assert.equal(result.isValid, true);
      assert.equal(result.warnings.length, 1);
      assert.equal(result.warnings[0].type, 'UnusedVariable');
    });

    it('should provide improvement suggestions when enabled', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [
          {
            type: 'Performance',
            line: 15,
            message: 'Consider caching this component reference',
            improvement: 'Use GetComponent once in Start() and store the result'
          }
        ],
        message: 'Script validation completed with suggestions'
      }));

      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs',
        suggestImprovements: true
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.suggestImprovements, true);
      assert.equal(result.suggestions.length, 1);
      assert.equal(result.suggestions[0].type, 'Performance');
    });

    it('should check Unity compatibility when enabled', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        isValid: false,
        errors: [
          {
            type: 'UnityCompatibility',
            line: 3,
            message: 'This API is deprecated in Unity 2023.1+',
            severity: 'Error'
          }
        ],
        warnings: [],
        suggestions: [],
        unityVersion: '2023.1.0f1',
        message: 'Script validation completed with compatibility issues'
      }));

      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs',
        checkUnityCompatibility: true
      });

      assert.equal(result.isValid, false);
      assert.equal(result.errors[0].type, 'UnityCompatibility');
      assert.equal(result.unityVersion, '2023.1.0f1');
    });

    it('should disable syntax checking when requested', async () => {
      await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs',
        checkSyntax: false
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.checkSyntax, false);
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

    it('should include validation statistics', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        statistics: {
          linesOfCode: 45,
          complexityScore: 8,
          maintainabilityIndex: 85
        },
        validationTime: 250,
        message: 'Script validation completed successfully'
      }));

      const result = await handler.execute({
        scriptPath: 'Assets/Scripts/TestScript.cs'
      });

      assert.ok(result.statistics);
      assert.equal(result.statistics.linesOfCode, 45);
      assert.equal(result.validationTime, 250);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        scriptPath: 'Assets/Scripts/TestScript.cs'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result.isValid !== undefined);
      assert.ok(Array.isArray(result.result.errors));
      assert.ok(Array.isArray(result.result.warnings));
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({});

      assert.equal(result.status, 'error');
      assert.ok(result.error.includes('Either scriptPath, scriptContent, or scriptName must be provided'));
    });
  });
});