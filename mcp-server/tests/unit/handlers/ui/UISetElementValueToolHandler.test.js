import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { UISetElementValueToolHandler } from '../../../../src/handlers/ui/UISetElementValueToolHandler.js';
import { BaseToolHandler } from '../../../../src/handlers/base/BaseToolHandler.js';

describe('UISetElementValueToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(),
      sendCommand: mock.fn()
    };
    handler = new UISetElementValueToolHandler(mockUnityConnection);
  });

  describe('initialization', () => {
    it('should extend BaseToolHandler', () => {
      assert(handler instanceof BaseToolHandler);
    });

    it('should have correct tool name', () => {
      assert.strictEqual(handler.name, 'ui_set_element_value');
    });

    it('should have correct description', () => {
      assert.strictEqual(handler.description, 'Set values for UI input elements');
    });
  });

  describe('getDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = handler.getDefinition();

      assert.strictEqual(definition.name, 'ui_set_element_value');
      assert.strictEqual(definition.inputSchema.type, 'object');
      assert(definition.inputSchema.properties.elementPath);
      assert(definition.inputSchema.properties.value);
      assert(definition.inputSchema.properties.triggerEvents);
      assert.deepStrictEqual(definition.inputSchema.required, ['elementPath', 'value']);
    });
  });

  describe('execute', () => {
    it('should set input field value successfully', async () => {
      const mockResponse = {
        success: true,
        elementPath: '/Canvas/InputField',
        newValue: 'test@example.com',
        message: 'Successfully set value for EmailInput'
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      const result = await handler.execute({
        elementPath: '/Canvas/InputField',
        value: 'test@example.com'
      });

      assert.strictEqual(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments, [
        'set_ui_element_value',
        {
          elementPath: '/Canvas/InputField',
          value: 'test@example.com',
          triggerEvents: true
        }
      ]);

      assert.deepStrictEqual(result, mockResponse);
    });

    it('should set toggle value successfully', async () => {
      const mockResponse = {
        success: true,
        elementPath: '/Canvas/Toggle',
        newValue: 'true',
        message: 'Successfully set value for RememberMe'
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      const result = await handler.execute({
        elementPath: '/Canvas/Toggle',
        value: true
      });

      assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1], {
        elementPath: '/Canvas/Toggle',
        value: true,
        triggerEvents: true
      });

      assert.deepStrictEqual(result, mockResponse);
    });

    it('should set slider value successfully', async () => {
      const mockResponse = {
        success: true,
        elementPath: '/Canvas/Slider',
        newValue: '0.75',
        message: 'Successfully set value for VolumeSlider'
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      const result = await handler.execute({
        elementPath: '/Canvas/Slider',
        value: 0.75
      });

      assert.deepStrictEqual(result, mockResponse);
    });

    it('should set dropdown value successfully', async () => {
      const mockResponse = {
        success: true,
        elementPath: '/Canvas/Dropdown',
        newValue: '2',
        message: 'Successfully set value for QualityDropdown'
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      const result = await handler.execute({
        elementPath: '/Canvas/Dropdown',
        value: 2
      });

      assert.deepStrictEqual(result, mockResponse);
    });

    it('should set value without triggering events when specified', async () => {
      const mockResponse = {
        success: true,
        elementPath: '/Canvas/InputField',
        newValue: 'silent update',
        message: 'Successfully set value'
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      await handler.execute({
        elementPath: '/Canvas/InputField',
        value: 'silent update',
        triggerEvents: false
      });

      assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1], {
        elementPath: '/Canvas/InputField',
        value: 'silent update',
        triggerEvents: false
      });
    });

    it('should connect if not connected', async () => {
      mockUnityConnection.isConnected.mock.mockImplementationOnce(() => false);
      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve({ success: true })
      );

      await handler.execute({
        elementPath: '/Canvas/InputField',
        value: 'test'
      });

      assert.strictEqual(mockUnityConnection.connect.mock.calls.length, 1);
    });

    it('should handle Unity errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.reject(new Error('Unsupported element type'))
      );

      await assert.rejects(
        async () =>
          await handler.execute({
            elementPath: '/Canvas/Label',
            value: 'test'
          }),
        { message: 'Unsupported element type' }
      );
    });
  });

  describe('handle', () => {
    it('should return success response for valid execution', async () => {
      const mockResponse = {
        success: true,
        elementPath: '/Canvas/InputField',
        newValue: 'test',
        message: 'Success'
      };

      mockUnityConnection.sendCommand.mock.mockImplementationOnce(() =>
        Promise.resolve(mockResponse)
      );

      const result = await handler.handle({
        elementPath: '/Canvas/InputField',
        value: 'test'
      });

      assert.strictEqual(result.status, 'success');
      assert.deepStrictEqual(result.result, mockResponse);
    });

    it('should return error response for missing elementPath', async () => {
      const result = await handler.handle({ value: 'test' });

      assert.strictEqual(result.status, 'error');
      assert.strictEqual(result.error, 'Missing required parameter: elementPath');
    });

    it('should return error response for missing value', async () => {
      const result = await handler.handle({ elementPath: '/Canvas/Input' });

      assert.strictEqual(result.status, 'error');
      assert.strictEqual(result.error, 'Missing required parameter: value');
    });
  });
});
