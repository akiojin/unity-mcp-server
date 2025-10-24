import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ListComponentsToolHandler } from '../../../../src/handlers/component/ListComponentsToolHandler.js';

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

describe('ListComponentsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new ListComponentsToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'component_list');
      assert.equal(handler.description, 'List all components on a GameObject in Unity');
      assert.deepEqual(handler.inputSchema.required, ['gameObjectPath']);
    });
  });

  describe('validate', () => {
    it('should fail without gameObjectPath', () => {
      assert.throws(
        () => handler.validate({}),
        { message: 'Missing required parameter: gameObjectPath' }
      );
    });

    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() => handler.validate({
        gameObjectPath: '/TestObject'
      }));
    });

    it('should pass with optional includeInherited', () => {
      assert.doesNotThrow(() => handler.validate({
        gameObjectPath: '/TestObject',
        includeInherited: true
      }));
    });
  });

  describe('execute', () => {
    it('should list components successfully', async () => {
      mockConnection.setMockResponse('list_components', {
        success: true,
        gameObjectPath: '/TestObject',
        components: [
          {
            type: 'Transform',
            fullTypeName: 'UnityEngine.Transform',
            canRemove: false,
            properties: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
              localScale: { x: 1, y: 1, z: 1 }
            }
          },
          {
            type: 'MeshRenderer',
            fullTypeName: 'UnityEngine.MeshRenderer',
            canRemove: true,
            properties: {
              enabled: true,
              shadowCastingMode: 'On'
            }
          }
        ],
        componentCount: 2
      });

      const result = await handler.execute({
        gameObjectPath: '/TestObject'
      });

      assert.equal(result.gameObjectPath, '/TestObject');
      assert.equal(result.componentCount, 2);
      assert.equal(result.components.length, 2);
      assert.equal(result.components[0].type, 'Transform');
      assert.equal(result.components[0].canRemove, false);
    });

    it('should handle GameObject not found error', async () => {
      mockConnection.setMockResponse('list_components', {
        error: 'GameObject not found at path: /NonExistent'
      });

      await assert.rejects(
        async () => await handler.execute({
          gameObjectPath: '/NonExistent'
        }),
        { message: 'GameObject not found at path: /NonExistent' }
      );
    });

    it('should handle empty components list', async () => {
      mockConnection.setMockResponse('list_components', {
        success: true,
        gameObjectPath: '/EmptyObject',
        components: [],
        componentCount: 0
      });

      const result = await handler.execute({
        gameObjectPath: '/EmptyObject'
      });

      assert.equal(result.componentCount, 0);
      assert.equal(result.components.length, 0);
    });

    it('should include inherited components when requested', async () => {
      mockConnection.setMockResponse('list_components', {
        success: true,
        gameObjectPath: '/TestObject',
        components: [
          {
            type: 'Transform',
            fullTypeName: 'UnityEngine.Transform',
            canRemove: false
          },
          {
            type: 'Component',
            fullTypeName: 'UnityEngine.Component',
            canRemove: false,
            inherited: true
          }
        ],
        componentCount: 2,
        includesInherited: true
      });

      const result = await handler.execute({
        gameObjectPath: '/TestObject',
        includeInherited: true
      });

      assert.equal(result.componentCount, 2);
      assert.equal(result.includesInherited, true);
    });

    it('should handle multiple components of same type', async () => {
      mockConnection.setMockResponse('list_components', {
        success: true,
        gameObjectPath: '/TestObject',
        components: [
          {
            type: 'BoxCollider',
            fullTypeName: 'UnityEngine.BoxCollider',
            canRemove: true,
            index: 0
          },
          {
            type: 'BoxCollider',
            fullTypeName: 'UnityEngine.BoxCollider',
            canRemove: true,
            index: 1
          }
        ],
        componentCount: 2
      });

      const result = await handler.execute({
        gameObjectPath: '/TestObject'
      });

      assert.equal(result.components.length, 2);
      assert.equal(result.components[0].type, 'BoxCollider');
      assert.equal(result.components[0].index, 0);
      assert.equal(result.components[1].index, 1);
    });
  });
});