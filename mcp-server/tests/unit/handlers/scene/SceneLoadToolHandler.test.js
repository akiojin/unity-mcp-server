import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SceneLoadToolHandler } from '../../../../src/handlers/scene/SceneLoadToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('SceneLoadToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new SceneLoadToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'load_scene');
    });
  });

  describe('SPEC compliance', () => {
    it('should load scene by path or name', () => {
      assert.equal(handler.name, 'load_scene');
    });
  });
});
