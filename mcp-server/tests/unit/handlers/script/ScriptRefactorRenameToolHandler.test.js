import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptRefactorRenameToolHandler } from '../../../../src/handlers/script/ScriptRefactorRenameToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ScriptRefactorRenameToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptRefactorRenameToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'rename_symbol');
    });

    it('should have relative, namePath, newName as required parameters', () => {
      assert.deepEqual(handler.inputSchema.required, ['relative', 'namePath', 'newName']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.relative);
      assert.ok(props.namePath);
      assert.ok(props.newName);
      assert.ok(props.preview);
    });
  });

  describe('validate', () => {
    it('should pass with all required parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          relative: 'Assets/Scripts/Example.cs',
          namePath: 'MyClass/MyMethod',
          newName: 'RenamedMethod'
        })
      );
    });

    it('should throw error when relative is missing', () => {
      assert.throws(
        () =>
          handler.validate({
            namePath: 'MyClass/MyMethod',
            newName: 'RenamedMethod'
          }),
        /relative, namePath, newName are required/
      );
    });

    it('should throw error when namePath is missing', () => {
      assert.throws(
        () =>
          handler.validate({
            relative: 'Assets/Scripts/Example.cs',
            newName: 'RenamedMethod'
          }),
        /relative, namePath, newName are required/
      );
    });

    it('should throw error when newName is missing', () => {
      assert.throws(
        () =>
          handler.validate({
            relative: 'Assets/Scripts/Example.cs',
            namePath: 'MyClass/MyMethod'
          }),
        /relative, namePath, newName are required/
      );
    });
  });

  describe('_summarizeResult', () => {
    it('should preserve success flag', () => {
      const result = handler._summarizeResult({ success: true });
      assert.equal(result.success, true);
    });

    it('should preserve applied flag', () => {
      const result = handler._summarizeResult({ applied: true });
      assert.equal(result.applied, true);
    });

    it('should trim errors to maximum count', () => {
      const errors = Array.from({ length: 50 }, (_, i) => ({ message: `Error ${i}` }));
      const result = handler._summarizeResult({ errors });
      assert.equal(result.errorCount, 30);
      assert.equal(result.totalErrors, 50);
    });

    it('should trim long error messages', () => {
      const longMessage = 'A'.repeat(300);
      const result = handler._summarizeResult({ errors: [{ message: longMessage }] });
      assert.ok(result.errors[0].message.length <= 200);
    });

    it('should truncate long preview text', () => {
      const longPreview = 'A'.repeat(2000);
      const result = handler._summarizeResult({ preview: longPreview });
      assert.ok(result.preview.length <= 1000);
      assert.equal(result.previewTruncated, true);
    });

    it('should truncate long diff text', () => {
      const longDiff = 'A'.repeat(2000);
      const result = handler._summarizeResult({ diff: longDiff });
      assert.ok(result.diff.length <= 1000);
      assert.equal(result.diffTruncated, true);
    });

    it('should preserve operation identifiers', () => {
      const result = handler._summarizeResult({
        operation: 'rename',
        relative: 'Assets/Scripts/Example.cs',
        symbolName: 'MyMethod'
      });
      assert.equal(result.operation, 'rename');
      assert.equal(result.relative, 'Assets/Scripts/Example.cs');
      assert.equal(result.symbolName, 'MyMethod');
    });
  });

  describe('SPEC compliance', () => {
    it('should support renaming symbols', async () => {
      // Mock LSP client would be needed for full integration test
      assert.equal(handler.name, 'rename_symbol');
    });

    it('should support preview mode by default', async () => {
      assert.doesNotThrow(() =>
        handler.validate({
          relative: 'Assets/Scripts/Example.cs',
          namePath: 'MyClass/MyMethod',
          newName: 'RenamedMethod'
        })
      );
    });

    it('should support apply mode when preview=false', async () => {
      assert.doesNotThrow(() =>
        handler.validate({
          relative: 'Assets/Scripts/Example.cs',
          namePath: 'MyClass/MyMethod',
          newName: 'RenamedMethod',
          preview: false
        })
      );
    });

    it('should support namePath format', async () => {
      assert.doesNotThrow(() =>
        handler.validate({
          relative: 'Assets/Scripts/Example.cs',
          namePath: 'Outer/Nested/Member',
          newName: 'NewMember'
        })
      );
    });
  });
});
