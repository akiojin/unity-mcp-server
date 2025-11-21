import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AssetPrefabSaveToolHandler } from '../../../../src/handlers/asset/AssetPrefabSaveToolHandler.js';

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

describe('AssetPrefabSaveToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new AssetPrefabSaveToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'asset_prefab_save');
      assert.equal(
        handler.description,
        'Save current prefab changes in prefab mode or save a GameObject as prefab override'
      );
      assert.equal(handler.inputSchema.required, undefined);
    });
  });

  describe('validate', () => {
    it('should pass without parameters (save current prefab)', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });

    it('should pass with valid gameObjectPath', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          gameObjectPath: '/Canvas/Button'
        })
      );
    });

    it('should fail with empty gameObjectPath', () => {
      assert.throws(() => handler.validate({ gameObjectPath: '' }), {
        message: 'gameObjectPath cannot be empty when provided'
      });
    });

    it('should pass with includeChildren option', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          gameObjectPath: '/Player',
          includeChildren: true
        })
      );
    });
  });

  describe('execute', () => {
    it('should save current prefab in prefab mode', async () => {
      mockConnection.setMockResponse('save_prefab', {
        success: true,
        savedInPrefabMode: true,
        prefabPath: 'Assets/Prefabs/MyPrefab.prefab',
        message: 'Prefab changes saved successfully'
      });

      const result = await handler.execute({});

      assert.equal(result.success, true);
      assert.equal(result.savedInPrefabMode, true);
      assert.equal(result.prefabPath, 'Assets/Prefabs/MyPrefab.prefab');
    });

    it('should save GameObject as prefab override', async () => {
      mockConnection.setMockResponse('save_prefab', {
        success: true,
        gameObjectPath: '/Player',
        prefabPath: 'Assets/Prefabs/PlayerPrefab.prefab',
        overridesApplied: 5,
        message: 'Applied 5 overrides to prefab'
      });

      const result = await handler.execute({
        gameObjectPath: '/Player'
      });

      assert.equal(result.gameObjectPath, '/Player');
      assert.equal(result.overridesApplied, 5);
    });

    it('should handle not in prefab mode error', async () => {
      mockConnection.setMockResponse('save_prefab', {
        error: 'Not currently in prefab mode and no gameObjectPath specified'
      });

      await assert.rejects(async () => await handler.execute({}), {
        message: 'Not currently in prefab mode and no gameObjectPath specified'
      });
    });

    it('should handle GameObject not a prefab instance', async () => {
      mockConnection.setMockResponse('save_prefab', {
        error: 'GameObject is not a prefab instance: /RegularObject'
      });

      await assert.rejects(
        async () => await handler.execute({ gameObjectPath: '/RegularObject' }),
        { message: 'GameObject is not a prefab instance: /RegularObject' }
      );
    });

    it('should save with children included', async () => {
      mockConnection.setMockResponse('save_prefab', {
        success: true,
        gameObjectPath: '/UI/Panel',
        prefabPath: 'Assets/Prefabs/UI/Panel.prefab',
        overridesApplied: 12,
        includedChildren: true,
        message: 'Applied 12 overrides including children'
      });

      const result = await handler.execute({
        gameObjectPath: '/UI/Panel',
        includeChildren: true
      });

      assert.equal(result.overridesApplied, 12);
      assert.equal(result.includedChildren, true);
    });
  });
});
