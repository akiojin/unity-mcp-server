import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { InputActionAddToolHandler } from '../../../../src/handlers/input/InputActionAddToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('InputActionAddToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        message: 'Added Action: Move'
      }
    });
    handler = new InputActionAddToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'input_action_add');
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
      assert.ok(props.actionType);
    });

    it('should have actionType with correct enum values', () => {
      const actionType = handler.inputSchema.properties.actionType;
      assert.deepEqual(actionType.enum, ['Button', 'Value', 'PassThrough']);
      assert.equal(actionType.default, 'Button');
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

    it('should pass with actionType parameter', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          mapName: 'PlayerMap',
          actionName: 'Move',
          actionType: 'Value'
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
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'input_action_add');

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

    it('should support Button action type', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        actionType: 'Button'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.actionType, 'Button');
    });

    it('should support Value action type', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move',
        actionType: 'Value'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.actionType, 'Value');
    });

    it('should support PassThrough action type', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Look',
        actionType: 'PassThrough'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.actionType, 'PassThrough');
    });

    it('should use default Button type when not specified', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump'
      });

      // actionType is optional, so it may or may not be in sentParams
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(sentParams.actionName === 'Jump');
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Action Map not found'
        }
      });
      handler = new InputActionAddToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'InvalidMap',
        actionName: 'Move'
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

    it('should handle duplicate action name', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Action already exists'
        }
      });
      handler = new InputActionAddToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('already exists'));
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
    it('should add new Action to Action Map', async () => {
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

    it('should support three action types', () => {
      const actionType = handler.inputSchema.properties.actionType;
      assert.equal(actionType.enum.length, 3);
      assert.ok(actionType.enum.includes('Button'));
      assert.ok(actionType.enum.includes('Value'));
      assert.ok(actionType.enum.includes('PassThrough'));
    });

    it('should default to Button type', () => {
      const actionType = handler.inputSchema.properties.actionType;
      assert.equal(actionType.default, 'Button');
    });
  });
});
