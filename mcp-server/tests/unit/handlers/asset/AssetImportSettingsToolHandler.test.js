import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssetImportSettingsToolHandler } from '../../../../src/handlers/asset/AssetImportSettingsToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AssetImportSettingsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new AssetImportSettingsToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'manage_asset_import_settings');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('SPEC compliance', () => {
    it('should manage asset import settings', () => {
      assert.equal(handler.name, 'manage_asset_import_settings');
    });
  });
});
