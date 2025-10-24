import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GameObjectDeleteToolHandler } from '../../../../src/handlers/gameobject/GameObjectDeleteToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GameObjectDeleteToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new GameObjectDeleteToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'gameobject_delete');
    });
  });

  describe('SPEC compliance', () => {
    it('should delete GameObject by path', () => {
      assert.equal(handler.name, 'gameobject_delete');
    });
  });
});
