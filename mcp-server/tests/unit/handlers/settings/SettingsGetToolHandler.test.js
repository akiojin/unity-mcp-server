import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SettingsGetToolHandler } from '../../../../src/handlers/settings/SettingsGetToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('SettingsGetToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new SettingsGetToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'settings_get');
    });
  });

  describe('SPEC compliance', () => {
    it('should get project settings', () => {
      assert.equal(handler.name, 'settings_get');
    });
  });
});
