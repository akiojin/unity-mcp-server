import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CreateGameObjectToolHandler } from '../../../src/handlers/gameobject/CreateGameObjectToolHandler.js';
import { createMockUnityConnection, UNITY_RESPONSES } from '../../../src/handlers/test-utils/test-helpers.js';

describe('CreateGameObjectToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: UNITY_RESPONSES.gameObject({ 
        id: -2000,
        name: 'NewCube'
      })
    });
    handler = new CreateGameObjectToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'create_gameobject');
      assert.equal(handler.description, 'Create a GameObject in Unity scene');
      assert.deepEqual(handler.inputSchema.required, []);
    });
  });

  describe('validate', () => {
    it('should pass with no parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });

    it('should pass with valid name', () => {
      assert.doesNotThrow(() => handler.validate({ name: 'TestObject' }));
    });

    it('should pass with valid position', () => {
      assert.doesNotThrow(() => handler.validate({ 
        position: { x: 1, y: 2, z: 3 } 
      }));
    });

    it('should pass with valid primitive type', () => {
      assert.doesNotThrow(() => handler.validate({ 
        primitiveType: 'cube' 
      }));
      assert.doesNotThrow(() => handler.validate({ 
        primitiveType: 'SPHERE' // Case insensitive
      }));
    });

    it('should fail with invalid primitive type', () => {
      assert.throws(
        () => handler.validate({ primitiveType: 'invalid' }),
        /primitiveType must be one of: cube, sphere, cylinder, capsule, plane, quad/
      );
    });

    it('should fail with invalid position', () => {
      assert.throws(
        () => handler.validate({ position: { x: 1, y: 2, z: 3, w: 4 } }),
        /position must only contain x, y, z properties/
      );
      assert.throws(
        () => handler.validate({ position: { x: '1', y: 2, z: 3 } }),
        /position.x must be a number/
      );
    });

    it('should fail with invalid layer', () => {
      assert.throws(
        () => handler.validate({ layer: -1 }),
        /layer must be between 0 and 31/
      );
      assert.throws(
        () => handler.validate({ layer: 32 }),
        /layer must be between 0 and 31/
      );
    });

    it('should validate all vector3 properties', () => {
      assert.doesNotThrow(() => handler.validate({
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 90, z: 0 },
        scale: { x: 2, y: 2, z: 2 }
      }));
    });
  });

  describe('execute', () => {
    it('should create GameObject with default parameters', async () => {
      const result = await handler.execute({});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.deepEqual(mockConnection.sendCommand.mock.calls[0].arguments[0], 'create_gameobject');
      assert.deepEqual(mockConnection.sendCommand.mock.calls[0].arguments[1], {});
    });

    it('should create GameObject with custom parameters', async () => {
      const params = {
        name: 'MyCube',
        primitiveType: 'cube',
        position: { x: 5, y: 0, z: -10 },
        rotation: { x: 0, y: 45, z: 0 },
        scale: { x: 2, y: 2, z: 2 },
        parentPath: '/Parent',
        tag: 'Player',
        layer: 8
      };
      
      const result = await handler.execute(params);
      
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.name, 'MyCube');
      assert.equal(sentParams.primitiveType, 'cube');
      assert.deepEqual(sentParams.position, { x: 5, y: 0, z: -10 });
      assert.equal(sentParams.layer, 8);
    });

    it('should pass through primitive type as-is', async () => {
      await handler.execute({ primitiveType: 'CUBE' });
      
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.primitiveType, 'CUBE');
    });

    it('should connect if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      
      await handler.execute({ name: 'Test' });
      
      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });

    it('should handle Unity errors', async () => {
      mockConnection.sendCommand.mock.mockImplementation(async () => {
        throw new Error('Unity error: GameObject limit reached');
      });
      
      await assert.rejects(
        async () => await handler.execute({}),
        /Unity error: GameObject limit reached/
      );
    });

    it('should return the created GameObject data', async () => {
      mockConnection.sendCommand.mock.mockImplementation(async () => ({
        id: -3000,
        name: 'TestCube',
        path: '/TestCube',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        tag: 'Untagged',
        layer: 0,
        isActive: true
      }));
      
      const result = await handler.execute({ name: 'TestCube', primitiveType: 'cube' });
      
      assert.equal(result.id, -3000);
      assert.equal(result.name, 'TestCube');
      assert.equal(result.path, '/TestCube');
      assert.equal(result.isActive, true);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        name: 'IntegrationTest',
        primitiveType: 'sphere',
        position: { x: 1, y: 2, z: 3 }
      });
      
      assert.equal(result.status, 'success');
      assert.equal(result.result.id, -2000);
      assert.equal(result.result.name, 'NewCube');
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({
        primitiveType: 'invalid_type'
      });
      
      assert.equal(result.status, 'error');
      assert.match(result.error, /primitiveType must be one of/);
      assert.equal(result.code, 'TOOL_ERROR');
    });
  });
});