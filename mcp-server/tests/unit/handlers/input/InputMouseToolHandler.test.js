import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { InputMouseToolHandler } from '../../../../src/handlers/input/InputMouseToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('InputMouseToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: { success: true }
    });
    handler = new InputMouseToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'input_mouse');
      assert.ok(handler.description.toLowerCase().includes('mouse'));
    });

    it('should have action enum with move, click, drag, scroll, button', () => {
      const action = handler.inputSchema.properties.action;
      assert.deepEqual(action.enum, ['move', 'click', 'drag', 'scroll', 'button']);
    });
  });

  describe('validate', () => {
    it('should pass with move action and coordinates', () => {
      assert.doesNotThrow(() => handler.validate({
        action: 'move', x: 100, y: 200
      }));
    });

    it('should pass with drag action and all coordinates', () => {
      assert.doesNotThrow(() => handler.validate({
        action: 'drag', startX: 0, startY: 0, endX: 100, endY: 100
      }));
    });

    it('should pass with button action and buttonAction', () => {
      assert.doesNotThrow(() => handler.validate({
        action: 'button', button: 'left', buttonAction: 'press'
      }));
    });

    it('should throw error when x/y missing for move', () => {
      assert.throws(() => handler.validate({ action: 'move' }), /x and y coordinates are required/);
    });

    it('should throw error when coordinates missing for drag', () => {
      assert.throws(() => handler.validate({ action: 'drag' }), /startX, startY, endX, and endY are required/);
    });

    it('should throw error when scroll deltas missing', () => {
      assert.throws(() => handler.validate({ action: 'scroll' }), /deltaX or deltaY is required/);
    });

    it('should throw error when button info missing for button action', () => {
      assert.throws(() => handler.validate({ action: 'button' }), /button is required/);
      assert.throws(() => handler.validate({ action: 'button', button: 'left' }), /buttonAction is required/);
    });

    it('should validate batched actions array', () => {
      assert.doesNotThrow(() => handler.validate({
        actions: [
          { action: 'move', x: 0, y: 0 },
          { action: 'button', button: 'left', buttonAction: 'press' }
        ]
      }));
    });

    it('should throw when actions array empty', () => {
      assert.throws(() => handler.validate({ actions: [] }), /actions must contain at least one entry/);
    });

    it('should throw when holdSeconds negative', () => {
      assert.throws(() => handler.validate({ action: 'button', button: 'left', buttonAction: 'press', holdSeconds: -1 }), /holdSeconds must be zero or positive/);
    });
  });

  describe('execute', () => {
    it('should execute move action successfully', async () => {
      const result = await handler.execute({ action: 'move', x: 100, y: 200 });
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'input_mouse');
      assert.ok(result.success);
    });

    it('should support click action with button', async () => {
      await handler.execute({ action: 'click', button: 'left', clickCount: 2 });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.button, 'left');
      assert.equal(params.clickCount, 2);
    });

    it('should support drag action', async () => {
      await handler.execute({ action: 'drag', startX: 0, startY: 0, endX: 100, endY: 100, button: 'left' });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.startX, 0);
      assert.equal(params.endX, 100);
    });

    it('should support scroll action', async () => {
      await handler.execute({ action: 'scroll', deltaX: 0, deltaY: 120 });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.deltaY, 120);
    });

    it('should support button press action with holdSeconds', async () => {
      await handler.execute({ action: 'button', button: 'left', buttonAction: 'press', holdSeconds: 0.25 });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.button, 'left');
      assert.equal(params.holdSeconds, 0.25);
    });

    it('should send batched actions payload when actions array provided', async () => {
      await handler.execute({
        actions: [
          { action: 'move', x: 10, y: 10 },
          { action: 'button', button: 'left', buttonAction: 'press' },
          { action: 'button', button: 'left', buttonAction: 'release' }
        ]
      });

      const [command, payload] = mockConnection.sendCommand.mock.calls[0].arguments;
      assert.equal(command, 'input_mouse');
      assert.deepEqual(payload.actions.length, 3);
    });

    it('should support absolute/relative coordinates', async () => {
      await handler.execute({ action: 'move', x: 100, y: 200, absolute: false });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.absolute, false);
    });

    it('should connect if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      await handler.execute({ action: 'move', x: 0, y: 0 });
      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('SPEC compliance', () => {
    it('should simulate mouse move', async () => {
      const result = await handler.execute({ action: 'move', x: 100, y: 200 });
      assert.ok(result.success);
    });

    it('should simulate mouse click', async () => {
      const result = await handler.execute({ action: 'click', button: 'left' });
      assert.ok(result.success);
    });

    it('should simulate mouse drag', async () => {
      const result = await handler.execute({ action: 'drag', startX: 0, startY: 0, endX: 100, endY: 100 });
      assert.ok(result.success);
    });

    it('should simulate mouse scroll', async () => {
      const result = await handler.execute({ action: 'scroll', deltaY: 120 });
      assert.ok(result.success);
    });
  });
});
