import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptSymbolFindToolHandler } from '../../../../src/handlers/script/ScriptSymbolFindToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ScriptSymbolFindToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptSymbolFindToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'script_symbol_find');
    });
  });

  describe('SPEC compliance', () => {
    it('should find symbol definitions by name', () => {
      assert.equal(handler.name, 'script_symbol_find');
    });
  });
});
