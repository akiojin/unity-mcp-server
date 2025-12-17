import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { UIClickElementToolHandler } from '../../../../src/handlers/ui/UIClickElementToolHandler.js';
import { BaseToolHandler } from '../../../../src/handlers/base/BaseToolHandler.js';

describe('UIClickElementToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(),
      sendCommand: mock.fn()
    };
    handler = new UIClickElementToolHandler(mockUnityConnection);
  });

  describe('initialization', () => {
    it('should extend BaseToolHandler', () => {
      assert(handler instanceof BaseToolHandler);
    });

    it('should have correct tool name', () => {
      assert.strictEqual(handler.name, 'click_ui_element');
    });

    it('should have correct description', () => {
      assert.strictEqual(handler.description, 'Simulate clicking on UI elements');
    });
  });

  describe('getDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = handler.getDefinition();

      assert.strictEqual(definition.name, 'click_ui_element');
      assert.strictEqual(definition.inputSchema.type, 'object');
      assert(definition.inputSchema.properties.elementPath);
      assert(definition.inputSchema.properties.clickType);
      assert(definition.inputSchema.properties.holdDuration);
      assert(definition.inputSchema.properties.position);
      assert.deepStrictEqual(definition.inputSchema.required, ['elementPath']);
    });
  });

  describe('validate', () => {
    it('should require elementPath', () => {
      assert.throws(() => handler.validate({}), {
        message: 'Missing required parameter: elementPath'
      });
    });

    it('should validate clickType enum', () => {
      assert.throws(
        () => handler.validate({ elementPath: '/Canvas/Button', clickType: 'invalid' }),
        { message: 'clickType must be one of: left, right, middle' }
      );
    });

    it('should validate holdDuration range', () => {
      assert.throws(() => handler.validate({ elementPath: '/Canvas/Button', holdDuration: -1 }), {
        message: 'holdDuration must be between 0 and 10000 milliseconds'
      });

      assert.throws(
        () => handler.validate({ elementPath: '/Canvas/Button', holdDuration: 10001 }),
        { message: 'holdDuration must be between 0 and 10000 milliseconds' }
      );
    });

    it('should validate position object', () => {
      assert.throws(
        () => handler.validate({ elementPath: '/Canvas/Button', position: { x: 'invalid' } }),
        { message: 'position.x must be a number' }
      );
    });

    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() => {
        handler.validate({
          elementPath: '/Canvas/Button',
          clickType: 'left',
          holdDuration: 100,
          position: { x: 0.5, y: 0.5 }
        });
      });
    });
  });

  describe('execute', () => {
    it('should click UI element successfully', async () => {
      const mockResponse = {
        success: true,
        elementPath: '/Canvas/Button',
        clickType: 'left',
        message: 'Successfully clicked StartButton'
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      const result = await handler.execute({ elementPath: '/Canvas/Button' });

      assert.strictEqual(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments, [
        'click_ui_element',
        {
          elementPath: '/Canvas/Button',
          clickType: 'left',
          holdDuration: 0,
          position: undefined
        }
      ]);

      assert.deepStrictEqual(result, mockResponse);
    });

    it('should click with custom parameters', async () => {
      const mockResponse = {
        success: true,
        elementPath: '/Canvas/Button',
        clickType: 'right',
        message: 'Successfully clicked Button'
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      const result = await handler.execute({
        elementPath: '/Canvas/Button',
        clickType: 'right',
        holdDuration: 500,
        position: { x: 0.3, y: 0.7 }
      });

      assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1], {
        elementPath: '/Canvas/Button',
        clickType: 'right',
        holdDuration: 500,
        position: { x: 0.3, y: 0.7 }
      });

      assert.deepStrictEqual(result, mockResponse);
    });

    it('should connect if not connected', async () => {
      mockUnityConnection.isConnected.mock.mockImplementationOnce(() => false);
      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve({ success: true })
      );

      await handler.execute({ elementPath: '/Canvas/Button' });

      assert.strictEqual(mockUnityConnection.connect.mock.calls.length, 1);
    });

    it('should handle Unity errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.reject(new Error('Element not found'))
      );

      await assert.rejects(async () => await handler.execute({ elementPath: '/Canvas/Button' }), {
        message: 'Element not found'
      });
    });
  });

  describe('handle', () => {
    it('should return success response for valid click', async () => {
      const mockResponse = {
        success: true,
        elementPath: '/Canvas/Button',
        clickType: 'left',
        message: 'Successfully clicked Button'
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      const result = await handler.handle({ elementPath: '/Canvas/Button' });

      assert.strictEqual(result.status, 'success');
      assert.deepStrictEqual(result.result, mockResponse);
    });

    it('should return error response for invalid parameters', async () => {
      const result = await handler.handle({ clickType: 'left' });

      assert.strictEqual(result.status, 'error');
      assert.strictEqual(result.error, 'Missing required parameter: elementPath');
      assert.strictEqual(result.code, 'TOOL_ERROR');
    });

    it('should return error response for execution failures', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.reject(new Error('UI element not interactable'))
      );

      const result = await handler.handle({ elementPath: '/Canvas/DisabledButton' });

      assert.strictEqual(result.status, 'error');
      assert.strictEqual(result.error, 'UI element not interactable');
    });
  });
});
