import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ComponentModifyToolHandler } from '../../../../src/handlers/component/ComponentModifyToolHandler.js';

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

describe('ComponentModifyToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new ComponentModifyToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'modify_component');
      assert.equal(
        handler.description,
        'Modify properties of a component on a GameObject in Unity'
      );
      assert.deepEqual(handler.inputSchema.required, [
        'gameObjectPath',
        'componentType',
        'properties'
      ]);
    });
  });

  describe('validate', () => {
    it('should fail without properties', () => {
      assert.throws(
        () =>
          handler.validate({
            gameObjectPath: '/TestObject',
            componentType: 'Rigidbody'
          }),
        { message: 'Missing required parameter: properties' }
      );
    });

    it('should fail with empty properties', () => {
      assert.throws(
        () =>
          handler.validate({
            gameObjectPath: '/TestObject',
            componentType: 'Rigidbody',
            properties: {}
          }),
        { message: 'properties cannot be empty' }
      );
    });

    it('should pass with valid parameters', () => {
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
    it('should modify component properties successfully', async () => {
      mockConnection.setMockResponse('modify_component', {
        success: true,
        componentType: 'Rigidbody',
        modifiedProperties: ['mass', 'drag'],
        message: 'Component properties updated'
      });

      const result = await handler.execute({
        gameObjectPath: '/TestObject',
        componentType: 'Rigidbody',
        properties: { mass: 5.0, drag: 0.5 }
      });

      assert.equal(result.componentType, 'Rigidbody');
      assert.deepEqual(result.modifiedProperties, ['mass', 'drag']);
    });

    it('should handle property not found error', async () => {
      mockConnection.setMockResponse('modify_component', {
        error: 'Property not found or invalid: nonExistentProperty'
      });

      await assert.rejects(
        async () =>
          await handler.execute({
            gameObjectPath: '/TestObject',
            componentType: 'Rigidbody',
            properties: { nonExistentProperty: 123 }
          }),
        { message: 'Property not found or invalid: nonExistentProperty' }
      );
    });

    it('should handle invalid property value error', async () => {
      mockConnection.setMockResponse('modify_component', {
        error: 'Invalid property value for mass: expected number, got string'
      });

      await assert.rejects(
        async () =>
          await handler.execute({
            gameObjectPath: '/TestObject',
            componentType: 'Rigidbody',
            properties: { mass: 'invalid' }
          }),
        { message: 'Invalid property value for mass: expected number, got string' }
      );
    });

    it('should handle nested properties', async () => {
      mockConnection.setMockResponse('modify_component', {
        success: true,
        componentType: 'Rigidbody',
        modifiedProperties: ['constraints.freezePositionX', 'constraints.freezePositionY'],
        message: 'Component properties updated'
      });

      const result = await handler.execute({
        gameObjectPath: '/TestObject',
        componentType: 'Rigidbody',
        properties: {
          'constraints.freezePositionX': true,
          'constraints.freezePositionY': true
        }
      });

      assert.deepEqual(result.modifiedProperties, [
        'constraints.freezePositionX',
        'constraints.freezePositionY'
      ]);
    });
  });
});
