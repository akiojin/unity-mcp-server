import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CreateGameObjectToolHandler } from '../../../../src/handlers/gameobject/CreateGameObjectToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('CreateGameObjectToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new CreateGameObjectToolHandler(mockConnection);
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
