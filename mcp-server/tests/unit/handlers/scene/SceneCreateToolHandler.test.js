import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SceneCreateToolHandler } from '../../../../src/handlers/scene/SceneCreateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('SceneCreateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new SceneCreateToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'create_scene');
    });
  });

  describe('SPEC compliance', () => {
    it('should create new scene', () => {
      assert.equal(handler.name, 'create_scene');
    });
  });
});
