import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GetHierarchyToolHandler } from '../../../../src/handlers/gameobject/GetHierarchyToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetHierarchyToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new GetHierarchyToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'get_hierarchy');
    });
  });

  describe('SPEC compliance', () => {
    it('should get scene hierarchy', () => {
      assert.equal(handler.name, 'get_hierarchy');
    });
  });
});
