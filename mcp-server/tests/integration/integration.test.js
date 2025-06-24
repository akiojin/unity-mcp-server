import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PingToolHandler } from '../../src/handlers/system/PingToolHandler.js';
import { CreateGameObjectToolHandler } from '../../src/handlers/gameobject/CreateGameObjectToolHandler.js';
import { UnityConnection } from '../../src/core/unityConnection.js';

describe('Integration Tests', () => {
  describe('Real Unity MCP Integration', () => {
    it('should connect to Unity and ping successfully', async () => {
      const connection = new UnityConnection();
      const handler = new PingToolHandler(connection);
      
      try {
        // This will connect to Unity if not already connected
        const result = await handler.execute({ message: 'Integration test ping' });
        
        assert.equal(typeof result, 'object');
        assert.equal(typeof result.message, 'string');
        assert.equal(typeof result.echo, 'string');
        assert.equal(typeof result.timestamp, 'string');
        assert.equal(result.echo, 'Integration test ping');
      } finally {
        connection.disconnect();
      }
    });

    it('should create a GameObject in Unity', async () => {
      const connection = new UnityConnection();
      const handler = new CreateGameObjectToolHandler(connection);
      
      try {
        const result = await handler.execute({
          name: 'IntegrationTestCube',
          primitiveType: 'cube',
          position: { x: 0, y: 0, z: 0 }
        });
        
        assert.equal(typeof result, 'object');
        assert.equal(typeof result.id, 'number');
        assert.equal(result.name, 'IntegrationTestCube');
        assert.equal(typeof result.path, 'string');
        assert.deepEqual(result.position, { x: 0, y: 0, z: 0 });
      } finally {
        connection.disconnect();
      }
    });

    it('should handle Unity errors gracefully', async () => {
      const connection = new UnityConnection();
      const handler = new CreateGameObjectToolHandler(connection);
      
      try {
        // Try to create with invalid parameters that should cause Unity error
        await assert.rejects(
          async () => await handler.execute({
            name: 'TestObject',
            parentPath: '/NonExistentParent/Child/Deep/Nested/Path'
          }),
          /error|failed|not found/i
        );
      } finally {
        connection.disconnect();
      }
    });
  });
});