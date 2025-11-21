import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { InputBindingCompositeCreateToolHandler } from '../../../../src/handlers/input/InputBindingCompositeCreateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('InputBindingCompositeCreateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        message: 'Created composite binding: WASD'
      }
    });
    handler = new InputBindingCompositeCreateToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'input_binding_composite_create');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('composite binding'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.assetPath);
      assert.ok(schema.properties.mapName);
      assert.ok(schema.properties.actionName);
      assert.ok(schema.properties.bindings);
      assert.deepEqual(schema.required, ['assetPath', 'mapName', 'actionName', 'bindings']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.assetPath);
      assert.ok(props.mapName);
      assert.ok(props.actionName);
      assert.ok(props.compositeType);
      assert.ok(props.name);
      assert.ok(props.bindings);
      assert.ok(props.groups);
    });

    it('should have compositeType with correct enum values', () => {
      const compositeType = handler.inputSchema.properties.compositeType;
      assert.deepEqual(compositeType.enum, ['2DVector', '1DAxis']);
      assert.equal(compositeType.default, '2DVector');
    });
  });

  describe('validate', () => {
    it('should pass with required parameters for 2D Vector', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          mapName: 'PlayerMap',
          actionName: 'Move',
          bindings: {
            up: '<Keyboard>/w',
            down: '<Keyboard>/s',
            left: '<Keyboard>/a',
            right: '<Keyboard>/d'
          }
        })
      );
    });

    it('should pass with required parameters for 1D Axis', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          mapName: 'PlayerMap',
          actionName: 'Throttle',
          compositeType: '1DAxis',
          bindings: {
            negative: '<Keyboard>/s',
            positive: '<Keyboard>/w'
          }
        })
      );
    });

    it('should pass with optional parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          mapName: 'PlayerMap',
          actionName: 'Move',
          compositeType: '2DVector',
          name: 'WASD',
          bindings: {
            up: '<Keyboard>/w',
            down: '<Keyboard>/s',
            left: '<Keyboard>/a',
            right: '<Keyboard>/d'
          },
          groups: 'Keyboard&Mouse'
        })
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with 2D Vector composite', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move',
        bindings: {
          up: '<Keyboard>/w',
          down: '<Keyboard>/s',
          left: '<Keyboard>/a',
          right: '<Keyboard>/d'
        }
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(
        mockConnection.sendCommand.mock.calls[0].arguments[0],
        'input_binding_composite_create'
      );

      assert.ok(result);
      assert.ok(result.content);
      assert.equal(result.isError, false);
    });

    it('should include all parameters in command', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move',
        name: 'WASD',
        bindings: {
          up: '<Keyboard>/w',
          down: '<Keyboard>/s',
          left: '<Keyboard>/a',
          right: '<Keyboard>/d'
        }
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.assetPath, 'Assets/Input/PlayerInput.inputactions');
      assert.equal(sentParams.mapName, 'PlayerMap');
      assert.equal(sentParams.actionName, 'Move');
      assert.equal(sentParams.name, 'WASD');
      assert.ok(sentParams.bindings);
    });

    it('should support 2D Vector composite type', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move',
        compositeType: '2DVector',
        bindings: {
          up: '<Keyboard>/w',
          down: '<Keyboard>/s',
          left: '<Keyboard>/a',
          right: '<Keyboard>/d'
        }
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.compositeType, '2DVector');
    });

    it('should support 1D Axis composite type', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Throttle',
        compositeType: '1DAxis',
        bindings: {
          negative: '<Keyboard>/s',
          positive: '<Keyboard>/w'
        }
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.compositeType, '1DAxis');
      assert.equal(sentParams.bindings.negative, '<Keyboard>/s');
      assert.equal(sentParams.bindings.positive, '<Keyboard>/w');
    });

    it('should support control scheme groups', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move',
        bindings: {
          up: '<Keyboard>/w',
          down: '<Keyboard>/s',
          left: '<Keyboard>/a',
          right: '<Keyboard>/d'
        },
        groups: 'Keyboard&Mouse'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.groups, 'Keyboard&Mouse');
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Action not found'
        }
      });
      handler = new InputBindingCompositeCreateToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'InvalidAction',
        bindings: { up: '<Keyboard>/w' }
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });

    it('should handle connection errors', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move',
        bindings: { up: '<Keyboard>/w' }
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('connection'));
    });

    it('should support gamepad composite bindings', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move',
        name: 'Gamepad Left Stick',
        bindings: {
          up: '<Gamepad>/leftStick/up',
          down: '<Gamepad>/leftStick/down',
          left: '<Gamepad>/leftStick/left',
          right: '<Gamepad>/leftStick/right'
        },
        groups: 'Gamepad'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(sentParams.bindings.up.includes('<Gamepad>'));
      assert.equal(sentParams.groups, 'Gamepad');
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move',
        bindings: {
          up: '<Keyboard>/w',
          down: '<Keyboard>/s',
          left: '<Keyboard>/a',
          right: '<Keyboard>/d'
        }
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move',
        bindings: {
          up: '<Keyboard>/w',
          down: '<Keyboard>/s',
          left: '<Keyboard>/a',
          right: '<Keyboard>/d'
        }
      });

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
      assert.ok(result.result.content[0].text);
    });
  });

  describe('SPEC compliance', () => {
    it('should create composite binding', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        mapName: 'PlayerMap',
        actionName: 'Move',
        bindings: {
          up: '<Keyboard>/w',
          down: '<Keyboard>/s',
          left: '<Keyboard>/a',
          right: '<Keyboard>/d'
        }
      });
      assert.equal(result.isError, false);
    });

    it('should validate required parameters', () => {
      const schema = handler.inputSchema;
      assert.ok(schema.required.includes('assetPath'));
      assert.ok(schema.required.includes('mapName'));
      assert.ok(schema.required.includes('actionName'));
      assert.ok(schema.required.includes('bindings'));
    });

    it('should support 2DVector and 1DAxis types', () => {
      const compositeType = handler.inputSchema.properties.compositeType;
      assert.ok(compositeType.enum.includes('2DVector'));
      assert.ok(compositeType.enum.includes('1DAxis'));
    });

    it('should default to 2DVector', () => {
      const compositeType = handler.inputSchema.properties.compositeType;
      assert.equal(compositeType.default, '2DVector');
    });
  });
});
