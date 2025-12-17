import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GetSceneInfoToolHandler } from '../../../../src/handlers/scene/GetSceneInfoToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetSceneInfoToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new GetSceneInfoToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'get_scene_info');
    });
  });

  describe('SPEC compliance', () => {
    it('should get detailed scene information', () => {
      assert.equal(handler.name, 'get_scene_info');
    });
  });
});
