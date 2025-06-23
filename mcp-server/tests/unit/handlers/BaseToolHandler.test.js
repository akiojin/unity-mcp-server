import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { BaseToolHandler } from '../../../src/handlers/base/BaseToolHandler.js';

// Create a test implementation of BaseToolHandler
class TestToolHandler extends BaseToolHandler {
  constructor(executeImpl) {
    super('test_tool', 'Test tool description', {
      type: 'object',
      properties: {
        requiredParam: { type: 'string' },
        optionalParam: { type: 'number' }
      },
      required: ['requiredParam']
    });
    this.executeImpl = executeImpl || (() => ({ result: 'success' }));
  }

  async execute(params) {
    return this.executeImpl(params);
  }
}

describe('BaseToolHandler', () => {
  let handler;
  let mockExecute;

  beforeEach(() => {
    mockExecute = mock.fn(() => ({ result: 'test success' }));
    handler = new TestToolHandler(mockExecute);
  });

  describe('constructor', () => {
    it('should set name, description, and inputSchema', () => {
      assert.equal(handler.name, 'test_tool');
      assert.equal(handler.description, 'Test tool description');
      assert.deepEqual(handler.inputSchema.required, ['requiredParam']);
    });

    it('should handle missing inputSchema', () => {
      const minimalHandler = new BaseToolHandler('minimal', 'Minimal handler');
      assert.equal(minimalHandler.name, 'minimal');
      assert.equal(minimalHandler.description, 'Minimal handler');
      assert.deepEqual(minimalHandler.inputSchema, {});
    });
  });

  describe('validate', () => {
    it('should pass validation with all required parameters', () => {
      assert.doesNotThrow(() => {
        handler.validate({ requiredParam: 'test' });
      });
    });

    it('should pass validation with required and optional parameters', () => {
      assert.doesNotThrow(() => {
        handler.validate({ requiredParam: 'test', optionalParam: 123 });
      });
    });

    it('should fail validation when required parameter is missing', () => {
      assert.throws(
        () => handler.validate({}),
        /Missing required parameter: requiredParam/
      );
    });

    it('should fail validation when required parameter is null', () => {
      assert.throws(
        () => handler.validate({ requiredParam: null }),
        /Missing required parameter: requiredParam/
      );
    });

    it('should fail validation when required parameter is undefined', () => {
      assert.throws(
        () => handler.validate({ requiredParam: undefined }),
        /Missing required parameter: requiredParam/
      );
    });

    it('should handle handlers without required fields', () => {
      const noRequiredHandler = new BaseToolHandler('test', 'test', {
        type: 'object',
        properties: { optional: { type: 'string' } }
      });
      assert.doesNotThrow(() => {
        noRequiredHandler.validate({});
      });
    });
  });

  describe('execute', () => {
    it('should throw error when execute is not implemented', async () => {
      const baseHandler = new BaseToolHandler('base', 'Base handler');
      await assert.rejects(
        async () => await baseHandler.execute({}),
        /execute\(\) must be implemented by subclass/
      );
    });

    it('should call custom execute implementation', async () => {
      const result = await handler.execute({ test: 'params' });
      assert.equal(mockExecute.mock.calls.length, 1);
      assert.deepEqual(mockExecute.mock.calls[0].arguments[0], { test: 'params' });
      assert.deepEqual(result, { result: 'test success' });
    });
  });

  describe('handle', () => {
    it('should successfully handle valid request', async () => {
      const result = await handler.handle({ requiredParam: 'test' });
      
      assert.equal(result.status, 'success');
      assert.deepEqual(result.result, { result: 'test success' });
      assert.equal(mockExecute.mock.calls.length, 1);
    });

    it('should handle request with no parameters when none required', async () => {
      const noRequiredHandler = new TestToolHandler();
      noRequiredHandler.inputSchema.required = undefined;
      
      const result = await noRequiredHandler.handle();
      assert.equal(result.status, 'success');
    });

    it('should return error response for validation failure', async () => {
      const result = await handler.handle({});
      
      assert.equal(result.status, 'error');
      assert.equal(result.error, 'Missing required parameter: requiredParam');
      assert.equal(result.code, 'TOOL_ERROR');
      assert.equal(result.details.tool, 'test_tool');
      assert.equal(mockExecute.mock.calls.length, 0);
    });

    it('should return error response for execution failure', async () => {
      const errorHandler = new TestToolHandler(() => {
        throw new Error('Execution failed');
      });
      
      const result = await errorHandler.handle({ requiredParam: 'test' });
      
      assert.equal(result.status, 'error');
      assert.equal(result.error, 'Execution failed');
      assert.equal(result.code, 'TOOL_ERROR');
    });

    it('should include custom error code if provided', async () => {
      const errorHandler = new TestToolHandler(() => {
        const error = new Error('Custom error');
        error.code = 'CUSTOM_ERROR';
        throw error;
      });
      
      const result = await errorHandler.handle({ requiredParam: 'test' });
      
      assert.equal(result.status, 'error');
      assert.equal(result.code, 'CUSTOM_ERROR');
    });

    it('should include stack trace in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const errorHandler = new TestToolHandler(() => {
        throw new Error('Dev error');
      });
      
      const result = await errorHandler.handle({ requiredParam: 'test' });
      
      assert.equal(result.status, 'error');
      assert.ok(result.details.stack);
      assert.ok(result.details.stack.includes('Dev error'));
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const errorHandler = new TestToolHandler(() => {
        throw new Error('Prod error');
      });
      
      const result = await errorHandler.handle({ requiredParam: 'test' });
      
      assert.equal(result.status, 'error');
      assert.equal(result.details.stack, undefined);
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('summarizeParams', () => {
    it('should handle null params', () => {
      assert.equal(handler.summarizeParams(null), 'No parameters');
    });

    it('should handle undefined params', () => {
      assert.equal(handler.summarizeParams(undefined), 'No parameters');
    });

    it('should handle non-object params', () => {
      assert.equal(handler.summarizeParams('string'), 'No parameters');
      assert.equal(handler.summarizeParams(123), 'No parameters');
    });

    it('should handle empty object', () => {
      assert.equal(handler.summarizeParams({}), 'Empty parameters');
    });

    it('should summarize simple values', () => {
      const summary = handler.summarizeParams({
        string: 'test',
        number: 123,
        boolean: true,
        null: null,
        undefined: undefined
      });
      
      assert.equal(summary, 'string: "test", number: 123, boolean: true, null: null, undefined: undefined');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(60);
      const summary = handler.summarizeParams({ long: longString });
      
      assert.ok(summary.includes('"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa..."'));
      assert.ok(summary.length < 100);
    });

    it('should handle arrays', () => {
      const summary = handler.summarizeParams({
        emptyArray: [],
        smallArray: [1, 2, 3],
        largeArray: new Array(100)
      });
      
      assert.equal(summary, 'emptyArray: [Array(0)], smallArray: [Array(3)], largeArray: [Array(100)]');
    });

    it('should handle objects', () => {
      const summary = handler.summarizeParams({
        obj: { nested: 'value' },
        date: new Date(),
        regex: /test/
      });
      
      assert.ok(summary.includes('obj: [Object]'));
      assert.ok(summary.includes('date: [Object]'));
      assert.ok(summary.includes('regex: [Object]'));
    });
  });

  describe('getDefinition', () => {
    it('should return tool definition', () => {
      const definition = handler.getDefinition();
      
      assert.equal(definition.name, 'test_tool');
      assert.equal(definition.description, 'Test tool description');
      assert.deepEqual(definition.inputSchema, handler.inputSchema);
    });

    it('should return minimal definition for minimal handler', () => {
      const minimalHandler = new BaseToolHandler('minimal', 'Minimal');
      const definition = minimalHandler.getDefinition();
      
      assert.equal(definition.name, 'minimal');
      assert.equal(definition.description, 'Minimal');
      assert.deepEqual(definition.inputSchema, {});
    });
  });
});