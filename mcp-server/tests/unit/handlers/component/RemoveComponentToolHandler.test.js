import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { RemoveComponentToolHandler } from '../../../../src/handlers/component/RemoveComponentToolHandler.js';

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

describe('RemoveComponentToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new RemoveComponentToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'component_remove');
      assert.equal(handler.description, 'Remove a component from a GameObject in Unity');
      assert.deepEqual(handler.inputSchema.required, ['gameObjectPath', 'componentType']);
    });
  });

  describe('validate', () => {
    it('should fail without gameObjectPath', () => {
      assert.throws(
        () => handler.validate({ componentType: 'Rigidbody' }),
        { message: 'Missing required parameter: gameObjectPath' }
      );
    });

    it('should fail without componentType', () => {
      assert.throws(
        () => handler.validate({ gameObjectPath: '/TestObject' }),
        { message: 'Missing required parameter: componentType' }
      );
    });

    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() => handler.validate({
        gameObjectPath: '/TestObject',
        componentType: 'Rigidbody'
      }));
    });

    it('should pass with componentIndex', () => {
      assert.doesNotThrow(() => handler.validate({
        gameObjectPath: '/TestObject',
        componentType: 'BoxCollider',
        componentIndex: 1
      }));
    });
  });

  describe('execute', () => {
    it('should remove component successfully', async () => {
      mockConnection.setMockResponse('remove_component', {
        success: true,
        removed: true,
        componentType: 'Rigidbody',
        message: 'Component removed successfully'
      });

      const result = await handler.execute({
        gameObjectPath: '/TestObject',
        componentType: 'Rigidbody'
      });

      assert.equal(result.removed, true);
      assert.equal(result.componentType, 'Rigidbody');
    });

    it('should handle component not found', async () => {
      mockConnection.setMockResponse('remove_component', {
        success: true,
        removed: false,
        componentType: 'Rigidbody',
        message: 'Component Rigidbody not found on GameObject'
      });

      const result = await handler.execute({
        gameObjectPath: '/TestObject',
        componentType: 'Rigidbody'
      });

      assert.equal(result.removed, false);
      assert.equal(result.componentType, 'Rigidbody');
    });

    it('should handle Transform removal error', async () => {
      mockConnection.setMockResponse('remove_component', {
        error: 'Cannot remove Transform component'
      });

      await assert.rejects(
        async () => await handler.execute({
          gameObjectPath: '/TestObject',
          componentType: 'Transform'
        }),
        { message: 'Cannot remove Transform component' }
      );
    });

    it('should handle component index', async () => {
      mockConnection.setMockResponse('remove_component', {
        success: true,
        removed: true,
        componentType: 'BoxCollider',
        componentIndex: 1,
        message: 'Component BoxCollider[1] removed successfully'
      });

      const result = await handler.execute({
        gameObjectPath: '/TestObject',
        componentType: 'BoxCollider',
        componentIndex: 1
      });

      assert.equal(result.removed, true);
      assert.equal(result.componentIndex, 1);
    });
  });
});