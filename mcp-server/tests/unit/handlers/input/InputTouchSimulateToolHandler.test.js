import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { InputTouchSimulateToolHandler } from '../../../../src/handlers/input/InputTouchSimulateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('InputTouchSimulateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new InputTouchSimulateToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'input_touch_simulate');
    });

    it('should have action enum with tap, swipe, pinch, multi', () => {
      const action = handler.inputSchema.properties.action;
      assert.deepEqual(action.enum, ['tap', 'swipe', 'pinch', 'multi']);
    });
  });

  describe('validate', () => {
    it('should pass with tap action', () => {
      assert.doesNotThrow(() => handler.validate({ action: 'tap', x: 100, y: 200 }));
    });

    it('should pass with swipe action', () => {
      assert.doesNotThrow(() => handler.validate({
        action: 'swipe', startX: 0, startY: 0, endX: 100, endY: 100
      }));
    });

    it('should pass with pinch action', () => {
      assert.doesNotThrow(() => handler.validate({
        action: 'pinch', centerX: 500, centerY: 500, startDistance: 100, endDistance: 200
      }));
    });

    it('should throw error when coordinates missing for tap', () => {
      assert.throws(() => handler.validate({ action: 'tap' }), /x and y coordinates are required/);
    });

    it('should throw error when coordinates missing for swipe', () => {
      assert.throws(() => handler.validate({ action: 'swipe' }), /startX, startY, endX, and endY are required/);
    });
  });

  describe('execute', () => {
    it('should execute tap action', async () => {
      const result = await handler.execute({ action: 'tap', x: 100, y: 200 });
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'simulate_touch_input');
      assert.ok(result.success);
    });

    it('should execute swipe action', async () => {
      await handler.execute({ action: 'swipe', startX: 0, startY: 0, endX: 100, endY: 100, duration: 500 });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.duration, 500);
    });

    it('should execute pinch action', async () => {
      await handler.execute({
        action: 'pinch', centerX: 500, centerY: 500, startDistance: 100, endDistance: 200
      });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.startDistance, 100);
      assert.equal(params.endDistance, 200);
    });

    it('should support multi-touch', async () => {
      await handler.execute({
        action: 'multi',
        touches: [{ x: 100, y: 200, phase: 'began' }, { x: 300, y: 400, phase: 'moved' }]
      });
      const params = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.touches.length, 2);
    });
  });

  describe('SPEC compliance', () => {
    it('should simulate tap', async () => {
      assert.ok(await handler.execute({ action: 'tap', x: 0, y: 0 }));
    });

    it('should simulate swipe', async () => {
      assert.ok(await handler.execute({ action: 'swipe', startX: 0, startY: 0, endX: 100, endY: 100 }));
    });

    it('should simulate pinch', async () => {
      assert.ok(await handler.execute({
        action: 'pinch', centerX: 0, centerY: 0, startDistance: 10, endDistance: 20
      }));
    });
  });
});
