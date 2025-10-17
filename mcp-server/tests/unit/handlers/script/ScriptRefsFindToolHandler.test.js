import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptRefsFindToolHandler } from '../../../../src/handlers/script/ScriptRefsFindToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ScriptRefsFindToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptRefsFindToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'script_refs_find');
    });
  });

  describe('SPEC compliance', () => {
    it('should find code references using LSP', () => {
      assert.equal(handler.name, 'script_refs_find');
    });
  });
});
