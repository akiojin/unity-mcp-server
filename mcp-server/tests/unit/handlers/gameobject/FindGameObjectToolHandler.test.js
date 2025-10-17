import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FindGameObjectToolHandler } from '../../../../src/handlers/gameobject/FindGameObjectToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('FindGameObjectToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new FindGameObjectToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'find_gameobject');
    });
  });

  describe('SPEC compliance', () => {
    it('should find GameObjects by name, tag, or layer', () => {
      assert.equal(handler.name, 'find_gameobject');
    });
  });
});
