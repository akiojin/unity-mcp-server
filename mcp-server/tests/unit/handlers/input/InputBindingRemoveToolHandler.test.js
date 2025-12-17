import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { InputBindingRemoveToolHandler } from '../../../../src/handlers/input/InputBindingRemoveToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('InputBindingRemoveToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        message: 'Removed Binding'
      }
    });
    handler = new InputBindingRemoveToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'input_binding_remove');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('Binding'));
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
      assert.ok(props.bindingIndex);
      assert.ok(props.bindingPath);
    });

    it('should have optional bindingIndex and bindingPath', () => {
      const required = handler.inputSchema.required;
      assert.ok(!required.includes('bindingIndex'));
      assert.ok(!required.includes('bindingPath'));
    });
  });

  describe('validate', () => {
    it('should pass with required parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          mapName: 'PlayerMap',
          actionName: 'Jump'
        })
      );
    });

    it('should pass with bindingIndex', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          mapName: 'PlayerMap',
          actionName: 'Jump',
          bindingIndex: 0
        })
      );
    });

    it('should pass with bindingPath', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          mapName: 'PlayerMap',
          actionName: 'Jump',
          bindingPath: '<Keyboard>/space'
        })
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with required parameters', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump'
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'remove_input_binding');

      assert.ok(result);
      assert.ok(result.content);
      assert.equal(result.isError, false);
    });

    it('should include all parameters in command', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.assetPath, 'Assets/Input/PlayerInput.inputactions');
      assert.equal(sentParams.mapName, 'PlayerMap');
      assert.equal(sentParams.actionName, 'Jump');
    });

    it('should support removing binding by index', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        bindingIndex: 0
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.bindingIndex, 0);
    });

    it('should support removing binding by path', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        bindingPath: '<Keyboard>/space'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.bindingPath, '<Keyboard>/space');
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Binding not found'
        }
      });
      handler = new InputBindingRemoveToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        bindingIndex: 99
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });

    it('should handle connection errors', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('connection'));
    });

    it('should handle Action not found', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Action not found'
        }
      });
      handler = new InputBindingRemoveToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'InvalidAction'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });

    it('should handle invalid binding index', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Binding index out of range'
        }
      });
      handler = new InputBindingRemoveToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        bindingIndex: 999
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('out of range'));
    });

    it('should remove first binding when no index specified', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump'
      });

      assert.equal(result.isError, false);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump'
      });

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
      assert.ok(result.result.content[0].text);
    });
  });

  describe('SPEC compliance', () => {
    it('should remove Binding from Action', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump'
      });
      assert.equal(result.isError, false);
    });

    it('should validate required parameters', () => {
      const schema = handler.inputSchema;
      assert.ok(schema.required.includes('assetPath'));
      assert.ok(schema.required.includes('mapName'));
      assert.ok(schema.required.includes('actionName'));
    });

    it('should support removal by index', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        bindingIndex: 0
      });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.bindingIndex, 0);
    });

    it('should support removal by path', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        bindingPath: '<Keyboard>/space'
      });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.bindingPath, '<Keyboard>/space');
    });
  });
});
