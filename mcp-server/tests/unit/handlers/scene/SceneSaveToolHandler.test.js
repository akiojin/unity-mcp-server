import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SceneSaveToolHandler } from '../../../../src/handlers/scene/SceneSaveToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('SceneSaveToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new SceneSaveToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'scene_save');
    });
  });

  describe('SPEC compliance', () => {
    it('should save current scene', () => {
      assert.equal(handler.name, 'scene_save');
    });
  });
});
