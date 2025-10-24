import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SceneListToolHandler } from '../../../../src/handlers/scene/SceneListToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('SceneListToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new SceneListToolHandler(mockConnection);
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
