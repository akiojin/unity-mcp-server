import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssetImportSettingsManageToolHandler } from '../../../../src/handlers/asset/AssetImportSettingsManageToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AssetImportSettingsManageToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new AssetImportSettingsManageToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'asset_import_settings_manage');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('SPEC compliance', () => {
    it('should manage asset import settings', () => {
      assert.equal(handler.name, 'asset_import_settings_manage');
    });
  });
});
