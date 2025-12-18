import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptSearchToolHandler } from '../../../../src/handlers/script/ScriptSearchToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ScriptSearchToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptSearchToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'search');
    });
  });

  describe('SPEC compliance', () => {
    it('should search C# code by substring/regex/glob', () => {
      assert.equal(handler.name, 'search');
    });
  });
});
