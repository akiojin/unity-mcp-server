import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { InputActionMapRemoveToolHandler } from '../../../../src/handlers/input/InputActionMapRemoveToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('InputActionMapRemoveToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        message: 'Removed Action Map: PlayerMap'
      }
    });
    handler = new InputActionMapRemoveToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'input_action_map_remove');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('Action Map'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.assetPath);
      assert.ok(schema.properties.mapName);
      assert.deepEqual(schema.required, ['assetPath', 'mapName']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.assetPath);
      assert.ok(props.mapName);
    });
  });

  describe('validate', () => {
    it('should pass with required parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          mapName: 'PlayerMap'
        })
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with required parameters', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap'
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(
        mockConnection.sendCommand.mock.calls[0].arguments[0],
        'input_action_map_remove'
      );

      assert.ok(result);
      assert.ok(result.content);
      assert.equal(result.isError, false);
    });

    it('should include asset path and map name in command', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.assetPath, 'Assets/Input/PlayerInput.inputactions');
      assert.equal(sentParams.mapName, 'PlayerMap');
    });

    it('should include success message in response', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap'
      });

      const text = result.content[0].text;
      assert.ok(text.includes('PlayerMap'));
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Action Map not found'
        }
      });
      handler = new InputActionMapRemoveToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'InvalidMap'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });

    it('should handle connection errors', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('connection'));
    });

    it('should handle asset not found', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Asset not found'
        }
      });
      handler = new InputActionMapRemoveToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/Invalid.inputactions',
        mapName: 'PlayerMap'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });

    it('should handle last Action Map deletion', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Cannot remove the last Action Map'
        }
      });
      handler = new InputActionMapRemoveToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'LastMap'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('last Action Map'));
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap'
      });

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
      assert.ok(result.result.content[0].text);
    });
  });

  describe('SPEC compliance', () => {
    it('should remove Action Map from Input Actions asset', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap'
      });
      assert.equal(result.isError, false);
    });

    it('should validate required parameters', () => {
      const schema = handler.inputSchema;
      assert.ok(schema.required.includes('assetPath'));
      assert.ok(schema.required.includes('mapName'));
    });

    it('should handle non-existent Action Map', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Action Map not found'
        }
      });
      handler = new InputActionMapRemoveToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'NonExistent'
      });
      assert.equal(result.isError, true);
    });
  });
});
