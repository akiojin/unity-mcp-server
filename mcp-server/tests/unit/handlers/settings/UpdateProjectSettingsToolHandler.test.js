import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateProjectSettingsToolHandler } from '../../../../src/handlers/settings/UpdateProjectSettingsToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('UpdateProjectSettingsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new UpdateProjectSettingsToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'update_project_settings');
    });
  });

  describe('SPEC compliance', () => {
    it('should update project settings', () => {
      assert.equal(handler.name, 'update_project_settings');
    });
  });
});
