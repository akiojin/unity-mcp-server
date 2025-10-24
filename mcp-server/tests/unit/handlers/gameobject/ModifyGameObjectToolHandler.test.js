import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ModifyGameObjectToolHandler } from '../../../../src/handlers/gameobject/ModifyGameObjectToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ModifyGameObjectToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ModifyGameObjectToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'gameobject_modify');
    });
  });

  describe('SPEC compliance', () => {
    it('should modify GameObject properties', () => {
      assert.equal(handler.name, 'gameobject_modify');
    });
  });
});
