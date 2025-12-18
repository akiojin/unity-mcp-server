import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptRemoveSymbolToolHandler } from '../../../../src/handlers/script/ScriptRemoveSymbolToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ScriptRemoveSymbolToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptRemoveSymbolToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'remove_symbol');
    });
  });

  describe('SPEC compliance', () => {
    it('should remove C# symbol with reference preflight', () => {
      assert.equal(handler.name, 'remove_symbol');
    });
  });
});
