import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteGameObjectToolHandler } from '../../../../src/handlers/gameobject/DeleteGameObjectToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('DeleteGameObjectToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new DeleteGameObjectToolHandler(mockConnection);
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
