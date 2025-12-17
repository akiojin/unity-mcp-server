import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { AssetPrefabInstantiateToolHandler } from '../../../../src/handlers/asset/AssetPrefabInstantiateToolHandler.js';
import { BaseToolHandler } from '../../../../src/handlers/base/BaseToolHandler.js';

describe('AssetPrefabInstantiateToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(),
      sendCommand: mock.fn()
    };
    handler = new AssetPrefabInstantiateToolHandler(mockUnityConnection);
  });

  describe('initialization', () => {
    it('should extend BaseToolHandler', () => {
      assert(handler instanceof BaseToolHandler);
    });

    it('should have correct tool name', () => {
      assert.strictEqual(handler.name, 'instantiate_prefab');
    });

    it('should have correct description', () => {
      assert.strictEqual(handler.description, 'Instantiate a prefab in the scene');
    });
  });

  describe('getDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = handler.getDefinition();

      assert.strictEqual(definition.name, 'instantiate_prefab');
      assert.strictEqual(definition.inputSchema.type, 'object');
      assert(definition.inputSchema.properties.prefabPath);
      assert(definition.inputSchema.properties.position);
      assert(definition.inputSchema.properties.rotation);
      assert(definition.inputSchema.properties.parent);
      assert(definition.inputSchema.properties.name);
      assert.deepStrictEqual(definition.inputSchema.required, ['prefabPath']);
    });
  });

  describe('validate', () => {
    it('should require prefabPath', () => {
      assert.throws(() => handler.validate({}), {
        message: 'Missing required parameter: prefabPath'
      });
    });

    it('should validate prefabPath format', () => {
      assert.throws(() => handler.validate({ prefabPath: 'invalid/path' }), {
        message: 'prefabPath must start with Assets/ and end with .prefab'
      });
    });

    it('should validate parent path when provided', () => {
      assert.throws(
        () =>
          handler.validate({
            prefabPath: 'Assets/Test.prefab',
            parent: ''
          }),
        { message: 'parent cannot be empty when provided' }
      );
    });

    it('should validate position object', () => {
      assert.throws(
        () =>
          handler.validate({
            prefabPath: 'Assets/Test.prefab',
            position: { x: 'invalid' }
          }),
        { message: 'position.x must be a number' }
      );

      assert.throws(
        () =>
          handler.validate({
            prefabPath: 'Assets/Test.prefab',
            position: { x: 0, y: 0 }
          }),
        { message: 'position must have x, y, and z properties' }
      );
    });

    it('should validate rotation object', () => {
      assert.throws(
        () =>
          handler.validate({
            prefabPath: 'Assets/Test.prefab',
            rotation: { x: 0, y: 'invalid', z: 0 }
          }),
        { message: 'rotation.y must be a number' }
      );
    });

    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() => {
        handler.validate({
          prefabPath: 'Assets/Prefabs/Player.prefab'
        });
      });

      assert.doesNotThrow(() => {
        handler.validate({
          prefabPath: 'Assets/Test.prefab',
          position: { x: 0, y: 1, z: -5 },
          rotation: { x: 0, y: 90, z: 0 },
          parent: '/Environment',
          name: 'Player_Instance'
        });
      });
    });
  });

  describe('execute', () => {
    it('should instantiate prefab with default settings', async () => {
      const mockResponse = {
        success: true,
        gameObjectPath: '/Player(Clone)',
        prefabPath: 'Assets/Prefabs/Player.prefab',
        position: { x: 0, y: 0, z: 0 },
        message: 'Prefab instantiated successfully'
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      const result = await handler.execute({
        prefabPath: 'Assets/Prefabs/Player.prefab'
      });

      assert.strictEqual(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments, [
        'instantiate_prefab',
        {
          prefabPath: 'Assets/Prefabs/Player.prefab',
          position: undefined,
          rotation: undefined,
          parent: undefined,
          name: undefined
        }
      ]);

      assert.deepStrictEqual(result, mockResponse);
    });

    it('should instantiate prefab with custom position and rotation', async () => {
      const mockResponse = {
        success: true,
        gameObjectPath: '/Enemy(Clone)',
        prefabPath: 'Assets/Prefabs/Enemy.prefab',
        position: { x: 10, y: 0, z: -5 },
        rotation: { x: 0, y: 180, z: 0 }
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      const result = await handler.execute({
        prefabPath: 'Assets/Prefabs/Enemy.prefab',
        position: { x: 10, y: 0, z: -5 },
        rotation: { x: 0, y: 180, z: 0 }
      });

      assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1], {
        prefabPath: 'Assets/Prefabs/Enemy.prefab',
        position: { x: 10, y: 0, z: -5 },
        rotation: { x: 0, y: 180, z: 0 },
        parent: undefined,
        name: undefined
      });

      assert.deepStrictEqual(result, mockResponse);
    });

    it('should instantiate prefab with parent and custom name', async () => {
      const mockResponse = {
        success: true,
        gameObjectPath: '/Environment/Tree_01',
        prefabPath: 'Assets/Prefabs/Tree.prefab',
        parent: '/Environment',
        name: 'Tree_01'
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      const result = await handler.execute({
        prefabPath: 'Assets/Prefabs/Tree.prefab',
        parent: '/Environment',
        name: 'Tree_01'
      });

      assert.deepStrictEqual(
        mockUnityConnection.sendCommand.mock.calls[0].arguments[1].parent,
        '/Environment'
      );
      assert.deepStrictEqual(
        mockUnityConnection.sendCommand.mock.calls[0].arguments[1].name,
        'Tree_01'
      );
      assert.deepStrictEqual(result, mockResponse);
    });

    it('should connect if not connected', async () => {
      mockUnityConnection.isConnected.mock.mockImplementationOnce(() => false);
      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve({ success: true, gameObjectPath: '/Test' })
      );

      await handler.execute({
        prefabPath: 'Assets/Test.prefab'
      });

      assert.strictEqual(mockUnityConnection.connect.mock.calls.length, 1);
    });

    it('should handle Unity errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.reject(new Error('Prefab asset not found'))
      );

      await assert.rejects(
        async () =>
          await handler.execute({
            prefabPath: 'Assets/NonExistent.prefab'
          }),
        { message: 'Prefab asset not found' }
      );
    });
  });

  describe('handle', () => {
    it('should return success response for valid instantiation', async () => {
      const mockResponse = {
        success: true,
        gameObjectPath: '/Player(Clone)',
        prefabPath: 'Assets/Player.prefab'
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      const result = await handler.handle({
        prefabPath: 'Assets/Player.prefab'
      });

      assert.strictEqual(result.status, 'success');
      assert.deepStrictEqual(result.result, mockResponse);
    });

    it('should return error response for missing prefabPath', async () => {
      const result = await handler.handle({
        position: { x: 0, y: 0, z: 0 }
      });

      assert.strictEqual(result.status, 'error');
      assert.strictEqual(result.error, 'Missing required parameter: prefabPath');
    });

    it('should return error response for invalid position', async () => {
      const result = await handler.handle({
        prefabPath: 'Assets/Test.prefab',
        position: { x: 0, y: 0 }
      });

      assert.strictEqual(result.status, 'error');
      assert.strictEqual(result.error, 'position must have x, y, and z properties');
    });
  });
});
