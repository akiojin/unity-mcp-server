import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { InputGamepadToolHandler } from '../../../../src/handlers/input/InputGamepadToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('InputGamepadToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new InputGamepadToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'input_gamepad');
    });

    it('should have action enum with button, stick, trigger, dpad', () => {
      const action = handler.inputSchema.properties.action;
      assert.deepEqual(action.enum, ['button', 'stick', 'trigger', 'dpad']);
    });
  });

  describe('validate', () => {
    it('should pass with button action', () => {
      assert.doesNotThrow(() => handler.validate({ action: 'button', button: 'a' }));
    });

    it('should pass with stick action', () => {
      assert.doesNotThrow(() => handler.validate({ action: 'stick', stick: 'left', x: 0.5, y: 0.5 }));
    });

    it('should pass with trigger action', () => {
      assert.doesNotThrow(() => handler.validate({ action: 'trigger', trigger: 'left', value: 0.8 }));
    });

    it('should pass with dpad action', () => {
      assert.doesNotThrow(() => handler.validate({ action: 'dpad', direction: 'up' }));
    });

    it('should throw error when button missing', () => {
      assert.throws(() => handler.validate({ action: 'button' }), /button is required/);
    });

    it('should throw error when stick values missing', () => {
      assert.throws(() => handler.validate({ action: 'stick' }), /x and y values are required/);
    });

    it('should throw error when stick values out of range', () => {
      assert.throws(() => handler.validate({ action: 'stick', x: 2, y: 0 }), /must be between -1 and 1/);
    });

    it('should throw error when trigger value missing', () => {
      assert.throws(() => handler.validate({ action: 'trigger' }), /value is required/);
    });

    it('should throw error when trigger value out of range', () => {
      assert.throws(() => handler.validate({ action: 'trigger', value: 1.5 }), /must be between 0 and 1/);
    });

    it('should throw error when direction missing for dpad', () => {
      assert.throws(() => handler.validate({ action: 'dpad' }), /direction is required/);
    });

    it('should validate batched actions array', () => {
      assert.doesNotThrow(() => handler.validate({
        actions: [
          { action: 'button', button: 'a' },
          { action: 'stick', stick: 'left', x: 0, y: 1 }
        ]
      }));
    });

    it('should throw when actions array empty', () => {
      assert.throws(() => handler.validate({ actions: [] }), /actions must contain at least one entry/);
    });

    it('should throw when holdSeconds negative', () => {
      assert.throws(() => handler.validate({ action: 'button', button: 'a', holdSeconds: -0.5 }), /holdSeconds must be zero or positive/);
    });
  });

  describe('execute', () => {
    it('should execute button action', async () => {
      const result = await handler.execute({ action: 'button', button: 'a', buttonAction: 'press' });
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'input_gamepad');
      assert.ok(result.success);
    });

    it('should execute stick action', async () => {
      await handler.execute({ action: 'stick', stick: 'left', x: 1, y: 0 });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.x, 1);
      assert.equal(params.y, 0);
    });

    it('should execute trigger action', async () => {
      await handler.execute({ action: 'trigger', trigger: 'right', value: 0.5 });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.value, 0.5);
    });

    it('should execute dpad action', async () => {
      await handler.execute({ action: 'dpad', direction: 'down' });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.direction, 'down');
    });

    it('should include holdSeconds when provided', async () => {
      await handler.execute({ action: 'button', button: 'b', buttonAction: 'press', holdSeconds: 0.75 });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.holdSeconds, 0.75);
    });

    it('should execute batched actions payload', async () => {
      await handler.execute({
        actions: [
          { action: 'button', button: 'x' },
          { action: 'stick', stick: 'left', x: 1, y: 1 },
          { action: 'dpad', direction: 'up' }
        ]
      });

      const [command, payload] = mockConnection.sendCommand.mock.calls[0].arguments;
      assert.equal(command, 'input_gamepad');
      assert.equal(payload.actions.length, 3);
    });
  });

  describe('SPEC compliance', () => {
    it('should simulate gamepad buttons', async () => {
      assert.ok(await handler.execute({ action: 'button', button: 'x' }));
    });

    it('should simulate analog sticks', async () => {
      assert.ok(await handler.execute({ action: 'stick', stick: 'left', x: 0, y: 0 }));
    });

    it('should simulate triggers', async () => {
      assert.ok(await handler.execute({ action: 'trigger', trigger: 'left', value: 1 }));
    });

    it('should simulate dpad', async () => {
      assert.ok(await handler.execute({ action: 'dpad', direction: 'up' }));
    });
  });
});
