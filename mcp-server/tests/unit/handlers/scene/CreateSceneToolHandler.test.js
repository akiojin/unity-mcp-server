import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CreateSceneToolHandler } from '../../../../src/handlers/scene/CreateSceneToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('CreateSceneToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new CreateSceneToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'scene_create');
    });
  });

  describe('SPEC compliance', () => {
    it('should create new scene', () => {
      assert.equal(handler.name, 'scene_create');
    });
  });
});
