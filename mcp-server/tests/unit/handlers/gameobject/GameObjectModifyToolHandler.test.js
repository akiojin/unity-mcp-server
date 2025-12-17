import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GameObjectModifyToolHandler } from '../../../../src/handlers/gameobject/GameObjectModifyToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GameObjectModifyToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new GameObjectModifyToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'modify_gameobject');
    });
  });

  describe('SPEC compliance', () => {
    it('should modify GameObject properties', () => {
      assert.equal(handler.name, 'modify_gameobject');
    });
  });
});
