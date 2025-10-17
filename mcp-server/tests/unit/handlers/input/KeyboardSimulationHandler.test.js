import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { KeyboardSimulationHandler } from '../../../../src/handlers/input/KeyboardSimulationHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('KeyboardSimulationHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true
      }
    });
    handler = new KeyboardSimulationHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'simulate_keyboard');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('keyboard'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.action);
      assert.deepEqual(schema.required, ['action']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.action);
      assert.ok(props.key);
      assert.ok(props.keys);
      assert.ok(props.text);
      assert.ok(props.typingSpeed);
    });

    it('should have action with correct enum values', () => {
      const action = handler.inputSchema.properties.action;
      assert.deepEqual(action.enum, ['press', 'release', 'type', 'combo']);
    });
  });

  describe('validate', () => {
    it('should pass with press action and key', () => {
      assert.doesNotThrow(() => handler.validate({
        action: 'press',
        key: 'space'
      }));
    });

    it('should pass with release action and key', () => {
      assert.doesNotThrow(() => handler.validate({
        action: 'release',
        key: 'space'
      }));
    });

    it('should pass with type action and text', () => {
      assert.doesNotThrow(() => handler.validate({
        action: 'type',
        text: 'Hello World'
      }));
    });

    it('should pass with combo action and keys array', () => {
      assert.doesNotThrow(() => handler.validate({
        action: 'combo',
        keys: ['ctrl', 'c']
      }));
    });

    it('should throw error when action is missing', () => {
      assert.throws(() => handler.validate({}), /action is required/);
    });

    it('should throw error when key is missing for press', () => {
      assert.throws(() => handler.validate({ action: 'press' }), /key is required/);
    });

    it('should throw error when text is missing for type', () => {
      assert.throws(() => handler.validate({ action: 'type' }), /text is required/);
    });

    it('should throw error when keys is missing for combo', () => {
      assert.throws(() => handler.validate({ action: 'combo' }), /keys array is required/);
    });

    it('should throw error when keys is empty for combo', () => {
      assert.throws(() => handler.validate({ action: 'combo', keys: [] }), /keys array is required/);
    });
  });

  describe('execute', () => {
    it('should execute press action successfully', async () => {
      const result = await handler.execute({
        action: 'press',
        key: 'space'
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'simulate_keyboard_input');

      assert.ok(result);
      assert.equal(result.success, true);
    });

    it('should include all parameters in command', async () => {
      await handler.execute({
        action: 'press',
        key: 'space'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.action, 'press');
      assert.equal(sentParams.key, 'space');
    });

    it('should support release action', async () => {
      await handler.execute({
        action: 'release',
        key: 'shift'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.action, 'release');
      assert.equal(sentParams.key, 'shift');
    });

    it('should support type action', async () => {
      await handler.execute({
        action: 'type',
        text: 'Hello World'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.action, 'type');
      assert.equal(sentParams.text, 'Hello World');
    });

    it('should support combo action', async () => {
      await handler.execute({
        action: 'combo',
        keys: ['ctrl', 'c']
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.action, 'combo');
      assert.deepEqual(sentParams.keys, ['ctrl', 'c']);
    });

    it('should support typing speed parameter', async () => {
      await handler.execute({
        action: 'type',
        text: 'Hello',
        typingSpeed: 100
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.typingSpeed, 100);
    });

    it('should support common key names', async () => {
      const keys = ['space', 'enter', 'escape', 'tab', 'backspace'];

      for (const key of keys) {
        mockConnection.sendCommand.mock.resetCalls();
        await handler.execute({ action: 'press', key });
        const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
        assert.equal(sentParams.key, key);
      }
    });

    it('should support modifier keys', async () => {
      const modifiers = ['ctrl', 'shift', 'alt', 'meta'];

      for (const mod of modifiers) {
        mockConnection.sendCommand.mock.resetCalls();
        await handler.execute({ action: 'press', key: mod });
        const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
        assert.equal(sentParams.key, mod);
      }
    });

    it('should support key combinations', async () => {
      await handler.execute({
        action: 'combo',
        keys: ['ctrl', 'shift', 's']
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.keys.length, 3);
    });

    it('should connect if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      await handler.execute({
        action: 'press',
        key: 'a'
      });

      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        action: 'press',
        key: 'space'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
    });
  });

  describe('SPEC compliance', () => {
    it('should simulate keyboard press', async () => {
      const result = await handler.execute({
        action: 'press',
        key: 'space'
      });
      assert.ok(result.success);
    });

    it('should simulate keyboard release', async () => {
      const result = await handler.execute({
        action: 'release',
        key: 'space'
      });
      assert.ok(result.success);
    });

    it('should simulate text typing', async () => {
      const result = await handler.execute({
        action: 'type',
        text: 'Test'
      });
      assert.ok(result.success);
    });

    it('should simulate key combinations', async () => {
      const result = await handler.execute({
        action: 'combo',
        keys: ['ctrl', 'v']
      });
      assert.ok(result.success);
    });

    it('should support typing speed control', async () => {
      await handler.execute({
        action: 'type',
        text: 'Test',
        typingSpeed: 50
      });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.typingSpeed, 50);
    });
  });
});
