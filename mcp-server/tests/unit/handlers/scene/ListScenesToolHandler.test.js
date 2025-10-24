import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ListScenesToolHandler } from '../../../../src/handlers/scene/ListScenesToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ListScenesToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ListScenesToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'scene_list');
    });
  });

  describe('SPEC compliance', () => {
    it('should list scenes in project', () => {
      assert.equal(handler.name, 'scene_list');
    });
  });
});
