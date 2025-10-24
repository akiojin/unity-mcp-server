import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SystemPingToolHandler } from '../../src/handlers/system/SystemPingToolHandler.js';
import { GameObjectCreateToolHandler } from '../../src/handlers/gameobject/GameObjectCreateToolHandler.js';
import { GameObjectDeleteToolHandler } from '../../src/handlers/gameobject/GameObjectDeleteToolHandler.js';
import { UnityConnection } from '../../src/core/unityConnection.js';

describe('Integration Tests', () => {
  describe('Real Unity MCP Integration', () => {
    it('should connect to Unity and ping successfully', async () => {
      const connection = new UnityConnection();
      const handler = new SystemPingToolHandler(connection);
      
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
      const createHandler = new GameObjectCreateToolHandler(connection);
      const deleteHandler = new GameObjectDeleteToolHandler(connection);
      let createdObjectPath = null;
      
      try {
        // Create the test GameObject
        const result = await createHandler.execute({
          name: 'IntegrationTestCube',
          primitiveType: 'cube',
          position: { x: 0, y: 0, z: 0 }
        });
        
        // Store the path for cleanup
        createdObjectPath = result.path;
        
        // Verify the creation
        assert.equal(typeof result, 'object');
        assert.equal(typeof result.id, 'number');
        assert.equal(result.name, 'IntegrationTestCube');
        assert.equal(typeof result.path, 'string');
        assert.deepEqual(result.position, { x: 0, y: 0, z: 0 });
      } finally {
        // Clean up: delete the created GameObject
        if (createdObjectPath) {
          try {
            await deleteHandler.execute({ path: createdObjectPath });
            console.log(`Cleaned up test GameObject: ${createdObjectPath}`);
          } catch (cleanupError) {
            console.warn(`Failed to clean up test GameObject: ${cleanupError.message}`);
          }
        }
        connection.disconnect();
      }
    });

    it('should handle Unity errors gracefully', async () => {
      const connection = new UnityConnection();
      const handler = new GameObjectCreateToolHandler(connection);
      
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