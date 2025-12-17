import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ComponentAddToolHandler } from '../../../../src/handlers/component/ComponentAddToolHandler.js';

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

describe('ComponentAddToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new ComponentAddToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'add_component');
      assert.equal(handler.description, 'Add a component to a GameObject in Unity');
      assert.deepEqual(handler.inputSchema.required, ['gameObjectPath', 'componentType']);
    });
  });

  describe('validate', () => {
    it('should fail without gameObjectPath', () => {
      assert.throws(() => handler.validate({ componentType: 'Rigidbody' }), {
        message: 'Missing required parameter: gameObjectPath'
      });
    });

    it('should fail without componentType', () => {
      assert.throws(() => handler.validate({ gameObjectPath: '/TestObject' }), {
        message: 'Missing required parameter: componentType'
      });
    });

    it('should fail with empty gameObjectPath', () => {
      assert.throws(() => handler.validate({ gameObjectPath: '', componentType: 'Rigidbody' }), {
        message: 'gameObjectPath cannot be empty'
      });
    });

    it('should fail with empty componentType', () => {
      assert.throws(() => handler.validate({ gameObjectPath: '/TestObject', componentType: '' }), {
        message: 'componentType cannot be empty'
      });
    });

    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          gameObjectPath: '/TestObject',
          componentType: 'Rigidbody'
        })
      );
    });

    it('should pass with properties', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          gameObjectPath: '/TestObject',
          componentType: 'Rigidbody',
          properties: { mass: 2.0 }
        })
      );
    });
  });

  describe('execute', () => {
    it('should add component successfully', async () => {
      mockConnection.setMockResponse('add_component', {
        success: true,
        componentType: 'Rigidbody',
        gameObjectPath: '/TestObject',
        message: 'Component added successfully'
      });

      const result = await handler.execute({
        gameObjectPath: '/TestObject',
        componentType: 'Rigidbody',
        properties: { mass: 2.0, useGravity: true }
      });

      assert.equal(result.componentType, 'Rigidbody');
      assert.equal(result.gameObjectPath, '/TestObject');
      assert.equal(result.message, 'Component added successfully');
    });

    it('should handle Unity errors', async () => {
      mockConnection.setMockResponse('add_component', {
        error: 'Component type not found: InvalidComponent'
      });

      await assert.rejects(
        async () =>
          await handler.execute({
            gameObjectPath: '/TestObject',
            componentType: 'InvalidComponent'
          }),
        { message: 'Component type not found: InvalidComponent' }
      );
    });

    it('should handle GameObject not found error', async () => {
      mockConnection.setMockResponse('add_component', {
        error: 'GameObject not found: /NonExistent'
      });

      await assert.rejects(
        async () =>
          await handler.execute({
            gameObjectPath: '/NonExistent',
            componentType: 'Rigidbody'
          }),
        { message: 'GameObject not found: /NonExistent' }
      );
    });

    it('should handle duplicate component error', async () => {
      mockConnection.setMockResponse('add_component', {
        error: 'GameObject already has component: Rigidbody'
      });

      await assert.rejects(
        async () =>
          await handler.execute({
            gameObjectPath: '/TestObject',
            componentType: 'Rigidbody'
          }),
        { message: 'GameObject already has component: Rigidbody' }
      );
    });
  });

  describe('handle', () => {
    it('should return success response', async () => {
      mockConnection.setMockResponse('add_component', {
        success: true,
        componentType: 'Rigidbody',
        gameObjectPath: '/TestObject',
        message: 'Component added successfully'
      });

      const result = await handler.handle({
        gameObjectPath: '/TestObject',
        componentType: 'Rigidbody'
      });

      assert.equal(result.status, 'success');
      assert.equal(result.result.componentType, 'Rigidbody');
    });

    it('should return error response for validation failure', async () => {
      const result = await handler.handle({
        componentType: 'Rigidbody'
        // Missing gameObjectPath
      });

      assert.equal(result.status, 'error');
      assert.equal(result.error, 'Missing required parameter: gameObjectPath');
    });
  });
});
