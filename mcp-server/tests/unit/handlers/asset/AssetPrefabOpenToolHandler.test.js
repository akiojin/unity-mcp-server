import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AssetPrefabOpenToolHandler } from '../../../../src/handlers/asset/AssetPrefabOpenToolHandler.js';

// Mock Unity connection
class MockUnityConnection {
  constructor() {
    this.connected = true;
    this.mockResponses = new Map();
  }

  isConnected() {
    return this.connected;
  }

  async connect() {
    this.connected = true;
  }

  setMockResponse(command, response) {
    this.mockResponses.set(command, response);
  }

  async sendCommand(command, params) {
    const response = this.mockResponses.get(command);
    if (response) {
      return typeof response === 'function' ? response(params) : response;
    }
    throw new Error(`No mock response for command: ${command}`);
  }
}

describe('AssetPrefabOpenToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new AssetPrefabOpenToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'open_prefab');
      assert.equal(handler.description, 'Open a prefab asset in prefab mode for editing');
      assert.deepEqual(handler.inputSchema.required, ['prefabPath']);
    });
  });

  describe('validate', () => {
    it('should fail without prefabPath', () => {
      assert.throws(() => handler.validate({}), {
        message: 'Missing required parameter: prefabPath'
      });
    });

    it('should fail with empty prefabPath', () => {
      assert.throws(() => handler.validate({ prefabPath: '' }), {
        message: 'prefabPath cannot be empty'
      });
    });

    it('should fail if prefabPath does not start with Assets/', () => {
      assert.throws(() => handler.validate({ prefabPath: 'Prefabs/MyPrefab.prefab' }), {
        message: 'prefabPath must start with Assets/ and end with .prefab'
      });
    });

    it('should fail if prefabPath does not end with .prefab', () => {
      assert.throws(() => handler.validate({ prefabPath: 'Assets/Prefabs/MyPrefab' }), {
        message: 'prefabPath must start with Assets/ and end with .prefab'
      });
    });

    it('should pass with valid prefabPath', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          prefabPath: 'Assets/Prefabs/MyPrefab.prefab'
        })
      );
    });

    it('should pass with optional parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          prefabPath: 'Assets/Prefabs/MyPrefab.prefab',
          focusObject: '/Root/Child',
          isolateObject: true
        })
      );
    });
  });

  describe('execute', () => {
    it('should open prefab successfully', async () => {
      mockConnection.setMockResponse('open_prefab', {
        success: true,
        prefabPath: 'Assets/Prefabs/MyPrefab.prefab',
        isInPrefabMode: true,
        prefabContentsRoot: '/MyPrefab',
        message: 'Prefab opened in prefab mode'
      });

      const result = await handler.execute({
        prefabPath: 'Assets/Prefabs/MyPrefab.prefab'
      });

      assert.equal(result.success, true);
      assert.equal(result.isInPrefabMode, true);
      assert.equal(result.prefabContentsRoot, '/MyPrefab');
    });

    it('should handle prefab not found error', async () => {
      mockConnection.setMockResponse('open_prefab', {
        error: 'Prefab asset not found at path: Assets/Prefabs/NonExistent.prefab'
      });

      await assert.rejects(
        async () =>
          await handler.execute({
            prefabPath: 'Assets/Prefabs/NonExistent.prefab'
          }),
        { message: 'Prefab asset not found at path: Assets/Prefabs/NonExistent.prefab' }
      );
    });

    it('should handle invalid asset type error', async () => {
      mockConnection.setMockResponse('open_prefab', {
        error: 'Asset at path is not a prefab: Assets/Materials/MyMaterial.mat'
      });

      await assert.rejects(
        async () =>
          await handler.execute({
            prefabPath: 'Assets/Materials/MyMaterial.mat'
          }),
        { message: 'Asset at path is not a prefab: Assets/Materials/MyMaterial.mat' }
      );
    });

    it('should open prefab with focus object', async () => {
      mockConnection.setMockResponse('open_prefab', {
        success: true,
        prefabPath: 'Assets/Prefabs/MyPrefab.prefab',
        isInPrefabMode: true,
        prefabContentsRoot: '/MyPrefab',
        focusedObject: '/MyPrefab/Button',
        message: 'Prefab opened with focus on /MyPrefab/Button'
      });

      const result = await handler.execute({
        prefabPath: 'Assets/Prefabs/MyPrefab.prefab',
        focusObject: '/Button'
      });

      assert.equal(result.focusedObject, '/MyPrefab/Button');
    });

    it('should handle already in prefab mode', async () => {
      mockConnection.setMockResponse('open_prefab', {
        success: true,
        prefabPath: 'Assets/Prefabs/MyPrefab.prefab',
        isInPrefabMode: true,
        prefabContentsRoot: '/MyPrefab',
        wasAlreadyOpen: true,
        message: 'Already editing this prefab'
      });

      const result = await handler.execute({
        prefabPath: 'Assets/Prefabs/MyPrefab.prefab'
      });

      assert.equal(result.wasAlreadyOpen, true);
    });
  });
});
