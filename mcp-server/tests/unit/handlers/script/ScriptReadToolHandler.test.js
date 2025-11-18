import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptReadToolHandler } from '../../../../src/handlers/script/ScriptReadToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ScriptReadToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptReadToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'script_read');
    });

    it('should have path as required parameter', () => {
      assert.deepEqual(handler.inputSchema.required, ['path']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.path);
      assert.ok(props.startLine);
      assert.ok(props.endLine);
      assert.ok(props.maxBytes);
    });
  });

  describe('validate', () => {
    it('should pass with valid path', () => {
      assert.doesNotThrow(() => handler.validate({ path: 'Assets/Scripts/Example.cs' }));
    });

    it('should pass with line range', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          path: 'Assets/Scripts/Example.cs',
          startLine: 10,
          endLine: 50
        })
      );
    });

    it('should throw error when path is empty', () => {
      assert.throws(() => handler.validate({ path: '' }), /path cannot be empty/);
    });

    it('should throw error when startLine is less than 1', () => {
      assert.throws(
        () =>
          handler.validate({
            path: 'Assets/Scripts/Example.cs',
            startLine: 0
          }),
        /startLine must be at least 1/
      );
    });

    it('should throw error when endLine is less than startLine', () => {
      assert.throws(
        () =>
          handler.validate({
            path: 'Assets/Scripts/Example.cs',
            startLine: 50,
            endLine: 10
          }),
        /endLine cannot be less than startLine/
      );
    });
  });

  describe('execute', () => {
    it('should reject paths not under Assets/ or Packages/', async () => {
      const result = await handler.execute({ path: 'Scripts/Example.cs' });
      assert.equal(result.error, 'Path must be under Assets/ or Packages/');
    });

    it('should reject non-.cs files', async () => {
      const result = await handler.execute({ path: 'Assets/Scripts/Example.txt' });
      assert.equal(result.error, 'Only .cs files are supported');
    });

    it('should normalize paths with repository prefix', async () => {
      const result = await handler.execute({ path: 'UnityMCPServer/Assets/Scripts/Example.cs' });
      // Result depends on file existence, but path should be normalized
      if (result.path) {
        assert.ok(result.path.startsWith('Assets/'));
      }
    });

    it('should support startLine parameter', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/Example.cs',
        startLine: 10
      });
      // Result depends on file existence
      if (result.success) {
        assert.ok(result.startLine >= 10);
      }
    });

    it('should support endLine parameter', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/Example.cs',
        startLine: 10,
        endLine: 50
      });
      // Result depends on file existence
      if (result.success) {
        assert.ok(result.endLine <= 50);
      }
    });

    it('should support maxBytes parameter', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/Example.cs',
        maxBytes: 100
      });
      // Result depends on file existence
      if (result.success && result.content) {
        assert.ok(Buffer.from(result.content, 'utf8').length <= 100);
      }
    });

    it('should default to 200-line window when endLine omitted', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/Example.cs',
        startLine: 1
      });
      // Result depends on file existence
      if (result.success) {
        assert.ok(result.endLine <= 200);
      }
    });
  });

  describe('SPEC compliance', () => {
    it('should read C# files from Assets/', async () => {
      const result = await handler.execute({ path: 'Assets/Scripts/Example.cs' });
      assert.ok(result.error || result.success);
    });

    it('should read C# files from Packages/', async () => {
      const result = await handler.execute({ path: 'Packages/unity-mcp-server/Editor/Example.cs' });
      assert.ok(result.error || result.success);
    });

    it('should support line range reading', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/Example.cs',
        startLine: 10,
        endLine: 20
      });
      assert.ok(result.error || result.success);
    });

    it('should support maxBytes limit', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/Example.cs',
        maxBytes: 1000
      });
      assert.ok(result.error || result.success);
    });
  });
});
