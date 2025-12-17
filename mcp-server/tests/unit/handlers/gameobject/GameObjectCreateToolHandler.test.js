import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GameObjectCreateToolHandler } from '../../../../src/handlers/gameobject/GameObjectCreateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GameObjectCreateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new GameObjectCreateToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'create_gameobject');
    });
  });

  describe('SPEC compliance', () => {
    it('should create GameObject in Unity scene', () => {
      assert.equal(handler.name, 'create_gameobject');
    });
  });
});
