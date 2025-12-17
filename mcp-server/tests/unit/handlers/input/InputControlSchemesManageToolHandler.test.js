import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { InputControlSchemesManageToolHandler } from '../../../../src/handlers/input/InputControlSchemesManageToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('InputControlSchemesManageToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        message: 'Added control scheme: Gamepad'
      }
    });
    handler = new InputControlSchemesManageToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'input_control_schemes_manage');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('Control Scheme'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.assetPath);
      assert.ok(schema.properties.operation);
      assert.deepEqual(schema.required, ['assetPath', 'operation']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.assetPath);
      assert.ok(props.operation);
      assert.ok(props.schemeName);
      assert.ok(props.devices);
    });

    it('should have operation with correct enum values', () => {
      const operation = handler.inputSchema.properties.operation;
      assert.deepEqual(operation.enum, ['add', 'remove', 'modify']);
    });
  });

  describe('validate', () => {
    it('should pass with required parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          operation: 'add'
        })
      );
    });

    it('should pass with optional parameters for add', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          operation: 'add',
          schemeName: 'Gamepad',
          devices: ['Gamepad']
        })
      );
    });

    it('should pass with optional parameters for remove', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          operation: 'remove',
          schemeName: 'Gamepad'
        })
      );
    });

    it('should pass with optional parameters for modify', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInput.inputactions',
          operation: 'modify',
          schemeName: 'Gamepad',
          devices: ['Gamepad', 'Joystick']
        })
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with add operation', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'add',
        schemeName: 'Gamepad',
        devices: ['Gamepad']
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'manage_control_schemes');

      assert.ok(result);
      assert.ok(result.content);
      assert.equal(result.isError, false);
    });

    it('should include all parameters in command', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'add',
        schemeName: 'Gamepad',
        devices: ['Gamepad']
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.assetPath, 'Assets/Input/PlayerInput.inputactions');
      assert.equal(sentParams.operation, 'add');
      assert.equal(sentParams.schemeName, 'Gamepad');
      assert.deepEqual(sentParams.devices, ['Gamepad']);
    });

    it('should support add operation', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'add',
        schemeName: 'Gamepad',
        devices: ['Gamepad']
      });

      assert.equal(result.isError, false);
      assert.ok(result.content[0].text.includes('Added'));
    });

    it('should support remove operation', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          message: 'Removed control scheme: Gamepad'
        }
      });
      handler = new InputControlSchemesManageToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'remove',
        schemeName: 'Gamepad'
      });

      assert.equal(result.isError, false);
      assert.ok(result.content[0].text.includes('Removed'));
    });

    it('should support modify operation', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          message: 'Modified control scheme: Gamepad'
        }
      });
      handler = new InputControlSchemesManageToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'modify',
        schemeName: 'Gamepad',
        devices: ['Gamepad', 'Joystick']
      });

      assert.equal(result.isError, false);
      assert.ok(result.content[0].text.includes('Modified'));
    });

    it('should support multiple device types', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'add',
        schemeName: 'Keyboard&Mouse',
        devices: ['Keyboard', 'Mouse']
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.deepEqual(sentParams.devices, ['Keyboard', 'Mouse']);
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Control scheme already exists'
        }
      });
      handler = new InputControlSchemesManageToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'add',
        schemeName: 'Gamepad'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('already exists'));
    });

    it('should handle connection errors', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'add'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('connection'));
    });

    it('should handle scheme not found for remove', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Control scheme not found'
        }
      });
      handler = new InputControlSchemesManageToolHandler(mockConnection);

      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'remove',
        schemeName: 'NonExistent'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });

    it('should support touch device type', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'add',
        schemeName: 'Touch',
        devices: ['Touchscreen']
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.ok(sentParams.devices.includes('Touchscreen'));
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'add',
        schemeName: 'Gamepad',
        devices: ['Gamepad']
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'add',
        schemeName: 'Gamepad',
        devices: ['Gamepad']
      });

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
      assert.ok(result.result.content[0].text);
    });
  });

  describe('SPEC compliance', () => {
    it('should manage Control Schemes', async () => {
      const result = await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'add',
        schemeName: 'Gamepad',
        devices: ['Gamepad']
      });
      assert.equal(result.isError, false);
    });

    it('should validate required parameters', () => {
      const schema = handler.inputSchema;
      assert.ok(schema.required.includes('assetPath'));
      assert.ok(schema.required.includes('operation'));
    });

    it('should support add, remove, and modify operations', () => {
      const operation = handler.inputSchema.properties.operation;
      assert.ok(operation.enum.includes('add'));
      assert.ok(operation.enum.includes('remove'));
      assert.ok(operation.enum.includes('modify'));
    });

    it('should support multiple device types in array', async () => {
      await handler.execute({
        assetPath: 'Assets/Input/PlayerInput.inputactions',
        operation: 'add',
        schemeName: 'Multi',
        devices: ['Keyboard', 'Mouse', 'Gamepad']
      });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.devices.length, 3);
    });
  });
});
