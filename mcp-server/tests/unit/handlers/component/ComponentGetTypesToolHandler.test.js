import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ComponentGetTypesToolHandler } from '../../../../src/handlers/component/ComponentGetTypesToolHandler.js';

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

describe('ComponentGetTypesToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new ComponentGetTypesToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'get_component_types');
      assert.equal(handler.description, 'Get available component types in Unity');
      assert.equal(handler.inputSchema.required, undefined);
    });
  });

  describe('execute', () => {
    it('should get common component types successfully', async () => {
      mockConnection.setMockResponse('get_component_types', {
        success: true,
        componentTypes: [
          {
            name: 'Transform',
            fullName: 'UnityEngine.Transform',
            category: 'Core',
            description: 'Position, rotation and scale of an object',
            canAdd: false
          },
          {
            name: 'Rigidbody',
            fullName: 'UnityEngine.Rigidbody',
            category: 'Physics',
            description: 'Adds physics simulation to the GameObject',
            canAdd: true
          },
          {
            name: 'BoxCollider',
            fullName: 'UnityEngine.BoxCollider',
            category: 'Physics',
            description: 'Box-shaped collision primitive',
            canAdd: true
          },
          {
            name: 'Light',
            fullName: 'UnityEngine.Light',
            category: 'Rendering',
            description: 'Light source in the scene',
            canAdd: true
          }
        ],
        totalCount: 4,
        categories: ['Core', 'Physics', 'Rendering']
      });

      const result = await handler.execute({});

      assert.equal(result.totalCount, 4);
      assert.equal(result.componentTypes.length, 4);
      assert.deepEqual(result.categories, ['Core', 'Physics', 'Rendering']);
      assert.equal(result.componentTypes[0].name, 'Transform');
      assert.equal(result.componentTypes[0].canAdd, false);
    });

    it('should filter by category', async () => {
      mockConnection.setMockResponse('get_component_types', {
        success: true,
        componentTypes: [
          {
            name: 'Rigidbody',
            fullName: 'UnityEngine.Rigidbody',
            category: 'Physics',
            description: 'Adds physics simulation to the GameObject',
            canAdd: true
          },
          {
            name: 'BoxCollider',
            fullName: 'UnityEngine.BoxCollider',
            category: 'Physics',
            description: 'Box-shaped collision primitive',
            canAdd: true
          }
        ],
        totalCount: 2,
        categories: ['Physics']
      });

      const result = await handler.execute({ category: 'Physics' });

      assert.equal(result.totalCount, 2);
      assert.equal(result.componentTypes.length, 2);
      assert.deepEqual(result.categories, ['Physics']);
    });

    it('should search for specific component types', async () => {
      mockConnection.setMockResponse('get_component_types', {
        success: true,
        componentTypes: [
          {
            name: 'BoxCollider',
            fullName: 'UnityEngine.BoxCollider',
            category: 'Physics',
            description: 'Box-shaped collision primitive',
            canAdd: true
          },
          {
            name: 'BoxCollider2D',
            fullName: 'UnityEngine.BoxCollider2D',
            category: 'Physics2D',
            description: '2D box-shaped collision primitive',
            canAdd: true
          }
        ],
        totalCount: 2,
        searchTerm: 'box'
      });

      const result = await handler.execute({ search: 'box' });

      assert.equal(result.totalCount, 2);
      assert.equal(result.searchTerm, 'box');
    });

    it('should return only addable components when requested', async () => {
      mockConnection.setMockResponse('get_component_types', {
        success: true,
        componentTypes: [
          {
            name: 'Rigidbody',
            fullName: 'UnityEngine.Rigidbody',
            category: 'Physics',
            canAdd: true
          },
          {
            name: 'Light',
            fullName: 'UnityEngine.Light',
            category: 'Rendering',
            canAdd: true
          }
        ],
        totalCount: 2,
        onlyAddable: true
      });

      const result = await handler.execute({ onlyAddable: true });

      assert.equal(result.onlyAddable, true);
      assert.equal(
        result.componentTypes.every(c => c.canAdd),
        true
      );
    });

    it('should handle error from Unity', async () => {
      mockConnection.setMockResponse('get_component_types', {
        error: 'Failed to retrieve component types'
      });

      await assert.rejects(async () => await handler.execute({}), {
        message: 'Failed to retrieve component types'
      });
    });
  });
});
