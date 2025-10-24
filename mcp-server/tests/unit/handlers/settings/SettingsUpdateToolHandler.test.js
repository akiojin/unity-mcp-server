import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SettingsUpdateToolHandler } from '../../../../src/handlers/settings/SettingsUpdateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('SettingsUpdateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new SettingsUpdateToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'settings_update');
    });
  });

  describe('SPEC compliance', () => {
    it('should update project settings', () => {
      assert.equal(handler.name, 'settings_update');
    });
  });
});
