import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GameObjectGetHierarchyToolHandler } from '../../../src/handlers/gameobject/GameObjectGetHierarchyToolHandler.js';
import { createMockUnityConnection } from '../../utils/test-helpers.js';

describe('GameObjectGetHierarchyToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        sceneName: 'TestScene',
        objectCount: 2,
        hierarchy: [
          {
            name: 'Object1',
            path: '/Object1'
          },
          {
            name: 'Object2',
            path: '/Object2'
          }
        ]
      }
    });
    handler = new GameObjectGetHierarchyToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.ok(handler.name);
      assert.ok(handler.description);
      assert.equal(handler.inputSchema.required, undefined);
    });
  });

  describe('validate', () => {
    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() => handler.validate({ includeComponents: true }));
    });

    it('should pass with rootPath parameter', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          rootPath: '/Player/Character',
          includeComponents: true
        })
      );
    });

    it('should pass with new optimization parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          includeTransform: false,
          includeTags: false,
          includeLayers: false,
          nameOnly: true,
          maxObjects: 1000
        })
      );
    });

    it('should default maxDepth to 0 when not specified', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });

    it('should pass with valid maxObjects values', () => {
      assert.doesNotThrow(() => handler.validate({ maxObjects: -1 }));
      assert.doesNotThrow(() => handler.validate({ maxObjects: 0 }));
      assert.doesNotThrow(() => handler.validate({ maxObjects: 100 }));
    });

    it('should throw with invalid maxObjects values', () => {
      assert.throws(
        () => handler.validate({ maxObjects: -2 }),
        /maxObjects must be -1 or a positive number/
      );
      assert.throws(
        () => handler.validate({ maxObjects: 'invalid' }),
        /maxObjects must be -1 or a positive number/
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({ includeComponents: true });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(result.sceneName, 'TestScene');
      assert.equal(result.objectCount, 2);
    });

    it('should execute with rootPath parameter', async () => {
      const result = await handler.execute({
        rootPath: '/Team_0',
        includeComponents: true
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      const [command, params] = mockConnection.sendCommand.mock.calls[0].arguments;
      assert.equal(command, 'get_hierarchy');
      assert.equal(params.rootPath, '/Team_0');
      assert.equal(params.includeComponents, true);
    });

    it('should handle rootPath with maxDepth 0 to get immediate children', async () => {
      const result = await handler.execute({
        rootPath: '/Team_0',
        maxDepth: 0
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      const [command, params] = mockConnection.sendCommand.mock.calls[0].arguments;
      assert.equal(params.rootPath, '/Team_0');
      assert.equal(params.maxDepth, 0);
    });

    it('should connect if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      mockConnection.connect = mock.fn(async () => {});

      await handler.execute({ includeComponents: true });

      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({ includeComponents: true });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
    });
  });
});
