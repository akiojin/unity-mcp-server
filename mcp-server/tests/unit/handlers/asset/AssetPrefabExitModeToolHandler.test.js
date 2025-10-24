import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AssetPrefabExitModeToolHandler } from '../../../../src/handlers/asset/AssetPrefabExitModeToolHandler.js';

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

describe('AssetPrefabExitModeToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new AssetPrefabExitModeToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'asset_prefab_exit_mode');
      assert.equal(handler.description, 'Exit prefab mode and return to the main scene');
      assert.equal(handler.inputSchema.required, undefined);
    });
  });

  describe('execute', () => {
    it('should exit prefab mode successfully with save', async () => {
      mockConnection.setMockResponse('exit_prefab_mode', {
        success: true,
        wasInPrefabMode: true,
        changesSaved: true,
        prefabPath: 'Assets/Prefabs/MyPrefab.prefab',
        message: 'Exited prefab mode and saved changes'
      });

      const result = await handler.execute({
        saveChanges: true
      });

      assert.equal(result.success, true);
      assert.equal(result.wasInPrefabMode, true);
      assert.equal(result.changesSaved, true);
      assert.equal(result.prefabPath, 'Assets/Prefabs/MyPrefab.prefab');
    });

    it('should exit prefab mode without saving', async () => {
      mockConnection.setMockResponse('exit_prefab_mode', {
        success: true,
        wasInPrefabMode: true,
        changesSaved: false,
        prefabPath: 'Assets/Prefabs/MyPrefab.prefab',
        message: 'Exited prefab mode without saving changes'
      });

      const result = await handler.execute({
        saveChanges: false
      });

      assert.equal(result.changesSaved, false);
    });

    it('should handle not in prefab mode', async () => {
      mockConnection.setMockResponse('exit_prefab_mode', {
        success: true,
        wasInPrefabMode: false,
        message: 'Not currently in prefab mode'
      });

      const result = await handler.execute({});

      assert.equal(result.wasInPrefabMode, false);
    });

    it('should default to saving changes', async () => {
      mockConnection.setMockResponse('exit_prefab_mode', {
        success: true,
        wasInPrefabMode: true,
        changesSaved: true,
        message: 'Exited prefab mode and saved changes'
      });

      const result = await handler.execute({});

      assert.equal(result.changesSaved, true);
    });

    it('should handle save errors', async () => {
      mockConnection.setMockResponse('exit_prefab_mode', {
        error: 'Failed to save prefab changes: Prefab is read-only'
      });

      await assert.rejects(
        async () => await handler.execute({ saveChanges: true }),
        { message: 'Failed to save prefab changes: Prefab is read-only' }
      );
    });
  });
});