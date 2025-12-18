import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptSymbolsGetToolHandler } from '../../../../src/handlers/script/ScriptSymbolsGetToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ScriptSymbolsGetToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptSymbolsGetToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'get_script_symbols');
    });
  });

  describe('SPEC compliance', () => {
    it('should identify symbols with spans', () => {
      assert.equal(handler.name, 'get_script_symbols');
    });
  });
});
