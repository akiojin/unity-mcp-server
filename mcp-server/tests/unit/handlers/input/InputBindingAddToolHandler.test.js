import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { InputBindingAddToolHandler } from '../../../../src/handlers/input/InputBindingAddToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('InputBindingAddToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        message: 'Added Binding: <Keyboard>/space'
      }
    });
    handler = new InputBindingAddToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'add_input_binding');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('Binding'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.assetPath);
      assert.ok(schema.properties.mapName);
      assert.ok(schema.properties.actionName);
      assert.ok(schema.properties.path);
      assert.deepEqual(schema.required, ['assetPath', 'mapName', 'actionName', 'path']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.assetPath);
      assert.ok(props.mapName);
      assert.ok(props.actionName);
      assert.ok(props.path);
      assert.ok(props.groups);
      assert.ok(props.interactions);
      assert.ok(props.processors);
    });

    it('should have optional parameters with correct types', () => {
      const props = handler.inputSchema.properties;
      assert.equal(props.groups.type, 'string');
      assert.equal(props.interactions.type, 'string');
      assert.equal(props.processors.type, 'string');
    });
  });

  describe('validate', () => {
    it('should pass with required parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          mapName: 'PlayerMap',
          actionName: 'Jump',
          path: '<Keyboard>/space'
        })
      );
    });

    it('should pass with optional parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          mapName: 'PlayerMap',
          actionName: 'Jump',
          path: '<Keyboard>/space',
          groups: 'Keyboard&Mouse',
          interactions: 'press',
          processors: 'scale'
        })
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with required parameters', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        path: '<Keyboard>/space'
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'add_input_binding');

      assert.ok(result);
      assert.ok(result.content);
      assert.equal(result.isError, false);
    });

    it('should include all required parameters in command', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        path: '<Keyboard>/space'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.assetPath, 'Assets/Input/PlayerInput.inputactions');
      assert.equal(sentParams.mapName, 'PlayerMap');
      assert.equal(sentParams.actionName, 'Jump');
      assert.equal(sentParams.path, '<Keyboard>/space');
    });

    it('should include success message with path in response', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        path: '<Keyboard>/space'
      });

      const text = result.content[0].text;
      assert.ok(text.includes('<Keyboard>/space'));
    });

    it('should support keyboard bindings', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        path: '<Keyboard>/space'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(sentParams.path.includes('<Keyboard>'));
    });

    it('should support gamepad bindings', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        path: '<Gamepad>/buttonSouth'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(sentParams.path.includes('<Gamepad>'));
    });

    it('should support mouse bindings', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Fire',
        path: '<Mouse>/leftButton'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(sentParams.path.includes('<Mouse>'));
    });

    it('should support control scheme groups', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        path: '<Keyboard>/space',
        groups: 'Keyboard&Mouse'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.groups, 'Keyboard&Mouse');
    });

    it('should support interactions', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Fire',
        path: '<Mouse>/leftButton',
        interactions: 'hold'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.interactions, 'hold');
    });

    it('should support processors', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Look',
        path: '<Mouse>/delta',
        processors: 'scale(x=0.5),invert'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.processors, 'scale(x=0.5),invert');
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Action not found'
        }
      });
      handler = new InputBindingAddToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'InvalidAction',
        path: '<Keyboard>/space'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });

    it('should handle connection errors', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        path: '<Keyboard>/space'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('connection'));
    });

    it('should handle invalid binding path', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Invalid binding path'
        }
      });
      handler = new InputBindingAddToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        path: 'invalid/path'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('Invalid'));
    });

    it('should support all optional parameters together', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        path: '<Keyboard>/space',
        groups: 'Keyboard&Mouse',
        interactions: 'press',
        processors: 'scale'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.groups, 'Keyboard&Mouse');
      assert.equal(sentParams.interactions, 'press');
      assert.equal(sentParams.processors, 'scale');
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        path: '<Keyboard>/space'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        path: '<Keyboard>/space'
      });

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
      assert.ok(result.result.content[0].text);
    });
  });

  describe('SPEC compliance', () => {
    it('should add new Binding to Action', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Jump',
        path: '<Keyboard>/space'
      });
      assert.equal(result.isError, false);
    });

    it('should validate required parameters', () => {
      const schema = handler.inputSchema;
      assert.ok(schema.required.includes('assetPath'));
      assert.ok(schema.required.includes('mapName'));
      assert.ok(schema.required.includes('actionName'));
      assert.ok(schema.required.includes('path'));
    });

    it('should support control scheme groups', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.groups);
      assert.equal(props.groups.type, 'string');
    });

    it('should support interactions', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.interactions);
      assert.equal(props.interactions.type, 'string');
    });

    it('should support processors', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.processors);
      assert.equal(props.processors.type, 'string');
    });
  });
});
