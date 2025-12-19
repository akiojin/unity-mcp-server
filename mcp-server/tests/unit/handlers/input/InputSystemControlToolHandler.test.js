import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { InputSystemControlToolHandler } from '../../../../src/handlers/input/InputSystemControlToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('InputSystemControlToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new InputSystemControlToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'control_input_system');
    });

    it('should have operation enum with all input types', () => {
      const operation = handler.inputSchema.properties.operation;
      assert.deepEqual(operation.enum, [
        'keyboard',
        'mouse',
        'gamepad',
        'touch',
        'sequence',
        'get_state'
      ]);
    });
  });

  describe('validate', () => {
    it('should pass with keyboard operation', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          operation: 'keyboard',
          parameters: { action: 'press', key: 'space' }
        })
      );
    });

    it('should pass with get_state operation without parameters', () => {
      assert.doesNotThrow(() => handler.validate({ operation: 'get_state' }));
    });

    it('should throw error when operation is missing', () => {
      assert.throws(() => handler.validate({}), /operation is required/);
    });

    it('should throw error when operation is invalid', () => {
      assert.throws(() => handler.validate({ operation: 'invalid' }), /Invalid operation/);
    });

    it('should throw error when parameters missing for non-get_state', () => {
      assert.throws(() => handler.validate({ operation: 'keyboard' }), /parameters are required/);
    });
  });

  describe('execute', () => {
    it('should execute keyboard operation', async () => {
      const result = await handler.execute({
        operation: 'keyboard',
        parameters: { action: 'press', key: 'a' }
      });
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'input_keyboard');
      assert.ok(result.success);
    });

    it('should execute mouse operation', async () => {
      await handler.execute({
        operation: 'mouse',
        parameters: { action: 'move', x: 100, y: 200 }
      });
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'input_mouse');
    });

    it('should execute gamepad operation', async () => {
      await handler.execute({
        operation: 'gamepad',
        parameters: { action: 'button', button: 'a' }
      });
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'input_gamepad');
    });

    it('should execute touch operation', async () => {
      await handler.execute({
        operation: 'touch',
        parameters: { action: 'tap', x: 100, y: 200 }
      });
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'simulate_touch');
    });

    it('should execute sequence operation', async () => {
      await handler.execute({
        operation: 'sequence',
        parameters: { steps: [] }
      });
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'create_input_sequence');
    });

    it('should execute get_state operation', async () => {
      await handler.execute({ operation: 'get_state' });
      assert.equal(
        mockConnection.sendCommand.mock.calls[0].arguments[0],
        'get_current_input_state'
      );
    });

    it('should pass parameters to Unity command', async () => {
      await handler.execute({
        operation: 'keyboard',
        parameters: { action: 'type', text: 'Hello' }
      });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.action, 'type');
      assert.equal(params.text, 'Hello');
    });

    it('should connect if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      await handler.execute({ operation: 'get_state' });
      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('SPEC compliance', () => {
    it('should support keyboard operations', async () => {
      assert.ok(
        await handler.execute({
          operation: 'keyboard',
          parameters: { action: 'press', key: 'a' }
        })
      );
    });

    it('should support mouse operations', async () => {
      assert.ok(
        await handler.execute({
          operation: 'mouse',
          parameters: { action: 'click' }
        })
      );
    });

    it('should support gamepad operations', async () => {
      assert.ok(
        await handler.execute({
          operation: 'gamepad',
          parameters: { action: 'button', button: 'a' }
        })
      );
    });

    it('should support touch operations', async () => {
      assert.ok(
        await handler.execute({
          operation: 'touch',
          parameters: { action: 'tap', x: 0, y: 0 }
        })
      );
    });

    it('should support sequence operations', async () => {
      assert.ok(
        await handler.execute({
          operation: 'sequence',
          parameters: { steps: [] }
        })
      );
    });

    it('should support get_state operations', async () => {
      assert.ok(await handler.execute({ operation: 'get_state' }));
    });
  });
});
