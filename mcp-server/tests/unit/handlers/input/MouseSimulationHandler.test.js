import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MouseSimulationHandler } from '../../../../src/handlers/input/MouseSimulationHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('MouseSimulationHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: { success: true }
    });
    handler = new MouseSimulationHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'simulate_mouse');
      assert.ok(handler.description.includes('mouse'));
    });

    it('should have action enum with move, click, drag, scroll', () => {
      const action = handler.inputSchema.properties.action;
      assert.deepEqual(action.enum, ['move', 'click', 'drag', 'scroll']);
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

    it('should throw error when x/y missing for move', () => {
      assert.throws(() => handler.validate({ action: 'move' }), /x and y coordinates are required/);
    });

    it('should throw error when coordinates missing for drag', () => {
      assert.throws(() => handler.validate({ action: 'drag' }), /startX, startY, endX, and endY are required/);
    });
  });

  describe('execute', () => {
    it('should execute move action successfully', async () => {
      const result = await handler.execute({ action: 'move', x: 100, y: 200 });
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'simulate_mouse_input');
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
