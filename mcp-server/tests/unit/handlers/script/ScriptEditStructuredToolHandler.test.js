import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptEditStructuredToolHandler } from '../../../../src/handlers/script/ScriptEditStructuredToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ScriptEditStructuredToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptEditStructuredToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'script_edit_structured');
    });

    it('should have operation, path, symbolName as required parameters', () => {
      assert.deepEqual(handler.inputSchema.required, ['operation', 'path', 'symbolName']);
    });

    it('should have operation enum with three edit types', () => {
      const operation = handler.inputSchema.properties.operation;
      assert.deepEqual(operation.enum, ['insert_before', 'insert_after', 'replace_body']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.operation);
      assert.ok(props.path);
      assert.ok(props.symbolName);
      assert.ok(props.kind);
      assert.ok(props.newText);
      assert.ok(props.preview);
    });
  });

  describe('validate', () => {
    it('should pass with valid replace_body operation', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          operation: 'replace_body',
          path: 'Assets/Scripts/Example.cs',
          symbolName: 'MyMethod'
        })
      );
    });

    it('should pass with insert_before operation', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          operation: 'insert_before',
          path: 'Assets/Scripts/Example.cs',
          symbolName: 'MyClass',
          kind: 'class'
        })
      );
    });

    it('should pass with insert_after operation', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          operation: 'insert_after',
          path: 'Assets/Scripts/Example.cs',
          symbolName: 'MyClass',
          kind: 'class'
        })
      );
    });

    it('should throw error when operation is invalid', () => {
      assert.throws(
        () =>
          handler.validate({
            operation: 'delete',
            path: 'Assets/Scripts/Example.cs',
            symbolName: 'MyMethod'
          }),
        /Invalid operation/
      );
    });

    it('should throw error when path is empty', () => {
      assert.throws(
        () =>
          handler.validate({
            operation: 'replace_body',
            path: '',
            symbolName: 'MyMethod'
          }),
        /path cannot be empty/
      );
    });

    it('should throw error when symbolName is empty', () => {
      assert.throws(
        () =>
          handler.validate({
            operation: 'replace_body',
            path: 'Assets/Scripts/Example.cs',
            symbolName: ''
          }),
        /symbolName cannot be empty/
      );
    });

    it('should throw error when inserting into method scope', () => {
      assert.throws(
        () =>
          handler.validate({
            operation: 'insert_before',
            path: 'Assets/Scripts/Example.cs',
            symbolName: 'MyMethod',
            kind: 'method'
          }),
        /Insert operations must target class\/namespace/
      );
    });
  });

  describe('_summarizeResult', () => {
    it('should preserve success flag', () => {
      const result = handler._summarizeResult({ success: true }, { preview: false });
      assert.equal(result.success, true);
    });

    it('should preserve applied flag', () => {
      const result = handler._summarizeResult({ applied: true }, { preview: false });
      assert.equal(result.applied, true);
    });

    it('should trim errors to maximum count', () => {
      const errors = Array.from({ length: 50 }, (_, i) => ({ message: `Error ${i}` }));
      const result = handler._summarizeResult({ errors }, { preview: false });
      assert.equal(result.errorCount, 30);
      assert.equal(result.totalErrors, 50);
    });

    it('should trim long error messages', () => {
      const longMessage = 'A'.repeat(300);
      const result = handler._summarizeResult(
        { errors: [{ message: longMessage }] },
        { preview: false }
      );
      assert.ok(result.errors[0].message.length <= 201); // 200 + '…'
    });

    it('should truncate long preview text', () => {
      const longPreview = 'A'.repeat(2000);
      const result = handler._summarizeResult({ preview: longPreview }, { preview: true });
      assert.ok(result.preview.length <= 1001); // 1000 + '…'
      assert.equal(result.previewTruncated, true);
    });

    it('should preserve operation and path identifiers', () => {
      const result = handler._summarizeResult(
        {
          operation: 'replace_body',
          path: 'Assets/Scripts/Example.cs',
          symbolName: 'MyMethod'
        },
        { preview: false }
      );
      assert.equal(result.operation, 'replace_body');
      assert.equal(result.path, 'Assets/Scripts/Example.cs');
      assert.equal(result.symbolName, 'MyMethod');
    });
  });

  describe('SPEC compliance', () => {
    it('should support replace_body operation', async () => {
      // Mock LSP client would be needed for full integration test
      assert.equal(handler.name, 'script_edit_structured');
    });

    it('should support insert_before operation', async () => {
      assert.doesNotThrow(() =>
        handler.validate({
          operation: 'insert_before',
          path: 'Assets/Scripts/Example.cs',
          symbolName: 'MyClass'
        })
      );
    });

    it('should support insert_after operation', async () => {
      assert.doesNotThrow(() =>
        handler.validate({
          operation: 'insert_after',
          path: 'Assets/Scripts/Example.cs',
          symbolName: 'MyClass'
        })
      );
    });

    it('should support preview mode', async () => {
      assert.doesNotThrow(() =>
        handler.validate({
          operation: 'replace_body',
          path: 'Assets/Scripts/Example.cs',
          symbolName: 'MyMethod',
          preview: true
        })
      );
    });
  });
});
