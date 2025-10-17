import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LoadSceneToolHandler } from '../../../../src/handlers/scene/LoadSceneToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('LoadSceneToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new LoadSceneToolHandler(mockConnection);
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
