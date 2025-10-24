import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CreateActionMapToolHandler } from '../../../../src/handlers/input/CreateActionMapToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('CreateActionMapToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        message: 'Created Action Map: PlayerMap'
      }
    });
    handler = new CreateActionMapToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'input_action_map_create');
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
      assert.ok(props.actions);
      assert.equal(props.actions.type, 'array');
    });

    it('should support optional actions parameter', () => {
      const actionItems = handler.inputSchema.properties.actions.items;
      assert.equal(actionItems.type, 'object');
      assert.ok(actionItems.properties.name);
      assert.ok(actionItems.properties.type);
      assert.deepEqual(actionItems.properties.type.enum, ['Button', 'Value', 'PassThrough']);
    });
  });

  describe('validate', () => {
    it('should pass with required parameters', () => {
      assert.doesNotThrow(() => handler.validate({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap'
      }));
    });

    it('should pass with optional actions', () => {
      assert.doesNotThrow(() => handler.validate({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actions: [
          { name: 'Move', type: 'Value' },
          { name: 'Jump', type: 'Button' }
        ]
      }));
    });
  });

  describe('execute', () => {
    it('should execute successfully with required parameters', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap'
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'input_action_map_create');

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

    it('should support optional actions parameter', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actions: [
          { name: 'Move', type: 'Value' }
        ]
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(Array.isArray(sentParams.actions));
      assert.equal(sentParams.actions.length, 1);
      assert.equal(sentParams.actions[0].name, 'Move');
      assert.equal(sentParams.actions[0].type, 'Value');
    });

    it('should handle empty actions array', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actions: []
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(Array.isArray(sentParams.actions));
      assert.equal(sentParams.actions.length, 0);
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Asset not found'
        }
      });
      handler = new CreateActionMapToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/Invalid.inputactions',
        mapName: 'PlayerMap'
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

    it('should handle multiple actions with different types', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actions: [
          { name: 'Move', type: 'Value' },
          { name: 'Jump', type: 'Button' },
          { name: 'Look', type: 'PassThrough' }
        ]
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.actions.length, 3);
      assert.equal(sentParams.actions[0].type, 'Value');
      assert.equal(sentParams.actions[1].type, 'Button');
      assert.equal(sentParams.actions[2].type, 'PassThrough');
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
    it('should create new Action Map in Input Actions asset', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap'
      });
      assert.equal(result.isError, false);
    });

    it('should support adding actions to new Action Map', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actions: [{ name: 'Move', type: 'Value' }]
      });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(sentParams.actions);
    });

    it('should validate required parameters', async () => {
      const schema = handler.inputSchema;
      assert.ok(schema.required.includes('assetPath'));
      assert.ok(schema.required.includes('mapName'));
    });

    it('should support Button, Value, and PassThrough action types', () => {
      const actionSchema = handler.inputSchema.properties.actions.items;
      assert.deepEqual(actionSchema.properties.type.enum, ['Button', 'Value', 'PassThrough']);
    });
  });
});
