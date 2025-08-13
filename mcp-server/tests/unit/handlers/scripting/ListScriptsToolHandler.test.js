import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ListScriptsToolHandler } from '../../../../src/handlers/scripting/ListScriptsToolHandler.js';

describe('ListScriptsToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async () => ({
        success: true,
        scripts: [
          {
            path: 'Assets/Scripts/PlayerController.cs',
            name: 'PlayerController',
            type: 'MonoBehaviour',
            size: 1024,
            lastModified: '2025-01-24T10:00:00Z'
          },
          {
            path: 'Assets/Scripts/GameManager.cs',
            name: 'GameManager',
            type: 'MonoBehaviour',
            size: 2048,
            lastModified: '2025-01-24T09:00:00Z'
          }
        ],
        totalCount: 2,
        message: 'Scripts listed successfully'
      }))
    };
    
    handler = new ListScriptsToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'list_scripts');
      assert.equal(handler.description, 'List C# scripts in Unity project');
      assert.ok(handler.inputSchema);
      assert.equal(typeof handler.execute, 'function');
    });

    it('should define optional input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.searchPath);
      assert.ok(schema.properties.pattern);
      assert.ok(schema.properties.scriptType);
      assert.deepEqual(schema.required, []);
    });

    it('should define sorting and filtering options', () => {
      const schema = handler.inputSchema;
      assert.ok(schema.properties.sortBy);
      assert.ok(schema.properties.sortOrder);
      assert.ok(schema.properties.includeMetadata);
      assert.ok(schema.properties.maxResults);
    });
  });

  describe('validate', () => {
    it('should pass with no parameters (list all)', () => {
      assert.doesNotThrow(() => {
        handler.validate({});
      });
    });

    it('should pass with valid search path', () => {
      assert.doesNotThrow(() => {
        handler.validate({ searchPath: 'Assets/Scripts/' });
      });
    });

    it('should pass with pattern matching', () => {
      assert.doesNotThrow(() => {
        handler.validate({ pattern: '*Controller*' });
      });
    });

    it('should validate search path format', () => {
      assert.throws(
        () => handler.validate({ searchPath: 'InvalidPath' }),
        /searchPath must start with Assets\//
      );
    });

    it('should validate script type enum', () => {
      assert.throws(
        () => handler.validate({ scriptType: 'InvalidType' }),
        /scriptType must be one of/
      );
    });

    it('should accept valid script types', () => {
      const validTypes = ['MonoBehaviour', 'ScriptableObject', 'Editor', 'StaticClass', 'Interface'];
      validTypes.forEach(type => {
        assert.doesNotThrow(() => {
          handler.validate({ scriptType: type });
        });
      });
    });

    it('should validate sort options', () => {
      assert.throws(
        () => handler.validate({ sortBy: 'InvalidSort' }),
        /sortBy must be one of/
      );

      assert.throws(
        () => handler.validate({ sortOrder: 'InvalidOrder' }),
        /sortOrder must be one of/
      );
    });

    it('should validate maxResults range', () => {
      assert.throws(
        () => handler.validate({ maxResults: 0 }),
        /maxResults must be between 1 and 1000/
      );

      assert.throws(
        () => handler.validate({ maxResults: 1001 }),
        /maxResults must be between 1 and 1000/
      );
    });

    it('should accept valid parameters', () => {
      assert.doesNotThrow(() => {
        handler.validate({
          searchPath: 'Assets/Scripts/',
          pattern: '*Controller*',
          scriptType: 'MonoBehaviour',
          sortBy: 'name',
          sortOrder: 'asc',
          includeMetadata: true,
          maxResults: 50
        });
      });
    });
  });

  describe('execute', () => {
    it('should list all scripts with default parameters', async () => {
      const result = await handler.execute({});

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockUnityConnection.sendCommand.mock.calls[0].arguments[0], 'list_scripts');
      
      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.searchPath, 'Assets/');
      assert.equal(params.includeMetadata, false);
      assert.equal(params.sortBy, 'name');
      assert.equal(params.sortOrder, 'asc');

      assert.ok(Array.isArray(result.scripts));
      assert.equal(result.scripts.length, 2);
      assert.equal(result.totalCount, 2);
      assert.equal(result.message, 'Scripts listed successfully');
    });

    it('should filter by search path', async () => {
      await handler.execute({
        searchPath: 'Assets/Scripts/Controllers/'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.searchPath, 'Assets/Scripts/Controllers/');
    });

    it('should filter by pattern', async () => {
      await handler.execute({
        pattern: '*Controller*'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.pattern, '*Controller*');
    });

    it('should filter by script type', async () => {
      await handler.execute({
        scriptType: 'ScriptableObject'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.scriptType, 'ScriptableObject');
    });

    it('should apply sorting options', async () => {
      await handler.execute({
        sortBy: 'lastModified',
        sortOrder: 'desc'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.sortBy, 'lastModified');
      assert.equal(params.sortOrder, 'desc');
    });

    it('should limit results', async () => {
      await handler.execute({
        maxResults: 10
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.maxResults, 10);
    });

    it('should exclude metadata when requested', async () => {
      await handler.execute({
        includeMetadata: false
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.includeMetadata, false);
    });

    it('should handle empty results', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        scripts: [],
        totalCount: 0,
        message: 'No scripts found'
      }));

      const result = await handler.execute({
        pattern: 'NonExistentPattern'
      });

      assert.ok(Array.isArray(result.scripts));
      assert.equal(result.scripts.length, 0);
      assert.equal(result.totalCount, 0);
    });

    it('should handle large result sets with pagination info', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        scripts: new Array(50).fill(null).map((_, i) => ({
          path: `Assets/Scripts/Script${i}.cs`,
          name: `Script${i}`,
          type: 'MonoBehaviour'
        })),
        totalCount: 150,
        hasMore: true,
        nextOffset: 50,
        message: 'Scripts listed successfully'
      }));

      const result = await handler.execute({
        maxResults: 50
      });

      assert.equal(result.scripts.length, 50);
      assert.equal(result.totalCount, 150);
      assert.equal(result.hasMore, true);
      assert.equal(result.nextOffset, 50);
    });

    it('should connect if not connected', async () => {
      mockUnityConnection.isConnected.mock.mockImplementation(() => false);

      await handler.execute({});

      assert.equal(mockUnityConnection.connect.mock.calls.length, 1);
    });

    it('should handle Unity connection errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => {
        throw new Error('Unity not responding');
      });

      await assert.rejects(
        () => handler.execute({}),
        /Unity not responding/
      );
    });

    it('should handle Unity command failures', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Failed to access scripts directory'
      }));

      await assert.rejects(
        () => handler.execute({}),
        /Failed to access scripts directory/
      );
    });

    it('should include script analysis when available', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        scripts: [
          {
            path: 'Assets/Scripts/PlayerController.cs',
            name: 'PlayerController',
            type: 'MonoBehaviour',
            size: 1024,
            lastModified: '2025-01-24T10:00:00Z',
            lineCount: 45,
            dependencies: ['UnityEngine', 'System'],
            hasErrors: false
          }
        ],
        totalCount: 1,
        typeDistribution: {
          'MonoBehaviour': 8,
          'ScriptableObject': 2,
          'Editor': 1
        },
        message: 'Scripts listed successfully'
      }));

      const result = await handler.execute({
        includeMetadata: true
      });

      const script = result.scripts[0];
      assert.equal(script.lineCount, 45);
      assert.ok(Array.isArray(script.dependencies));
      assert.equal(script.hasErrors, false);
      assert.ok(result.typeDistribution);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        searchPath: 'Assets/Scripts/'
      });

      assert.equal(result.status, 'success');
      assert.ok(Array.isArray(result.result.scripts));
      assert.ok(result.result.totalCount !== undefined);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({
        searchPath: 'InvalidPath'
      });

      assert.equal(result.status, 'error');
      assert.ok(result.error.includes('searchPath must start with Assets/'));
    });
  });
});