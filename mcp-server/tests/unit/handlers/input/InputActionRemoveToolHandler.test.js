import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { InputActionRemoveToolHandler } from '../../../../src/handlers/input/InputActionRemoveToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('InputActionRemoveToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        message: 'Removed Action: Move'
      }
    });
    handler = new InputActionRemoveToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'input_action_remove');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('Action'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.assetPath);
      assert.ok(schema.properties.mapName);
      assert.ok(schema.properties.actionName);
      assert.deepEqual(schema.required, ['assetPath', 'mapName', 'actionName']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.assetPath);
      assert.ok(props.mapName);
      assert.ok(props.actionName);
    });
  });

  describe('validate', () => {
    it('should pass with required parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          mapName: 'PlayerMap',
          actionName: 'Move'
        })
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with required parameters', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move'
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'remove_input_action');

      assert.ok(result);
      assert.ok(result.content);
      assert.equal(result.isError, false);
    });

    it('should include all parameters in command', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.assetPath, 'Assets/Input/PlayerInput.inputactions');
      assert.equal(sentParams.mapName, 'PlayerMap');
      assert.equal(sentParams.actionName, 'Move');
    });

    it('should include success message in response', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move'
      });

      const text = result.content[0].text;
      assert.ok(text.includes('Move'));
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Action not found'
        }
      });
      handler = new InputActionRemoveToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'InvalidAction'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });

    it('should handle connection errors', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('connection'));
    });

    it('should handle Action Map not found', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Action Map not found'
        }
      });
      handler = new InputActionRemoveToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'InvalidMap',
        actionName: 'Move'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });

    it('should handle last Action deletion', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Cannot remove the last Action'
        }
      });
      handler = new InputActionRemoveToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'LastAction'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('last Action'));
    });

    it('should successfully remove Action with bindings', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'MoveWithBindings'
      });

      assert.equal(result.isError, false);
      assert.ok(result.content[0].text.includes('MoveWithBindings'));
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move'
      });

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
      assert.ok(result.result.content[0].text);
    });
  });

  describe('SPEC compliance', () => {
    it('should remove Action from Action Map', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move'
      });
      assert.equal(result.isError, false);
    });

    it('should validate required parameters', () => {
      const schema = handler.inputSchema;
      assert.ok(schema.required.includes('assetPath'));
      assert.ok(schema.required.includes('mapName'));
      assert.ok(schema.required.includes('actionName'));
    });

    it('should handle non-existent Action', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Action not found'
        }
      });
      handler = new InputActionRemoveToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'NonExistent'
      });
      assert.equal(result.isError, true);
    });

    it('should remove Action and its bindings', async () => {
      // When an Action is removed, all its bindings should also be removed
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'ActionWithBindings'
      });
      assert.equal(result.isError, false);
    });
  });
});
