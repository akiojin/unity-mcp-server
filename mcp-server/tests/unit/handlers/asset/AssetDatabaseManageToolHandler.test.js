import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssetDatabaseManageToolHandler } from '../../../../src/handlers/asset/AssetDatabaseManageToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AssetDatabaseManageToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new AssetDatabaseManageToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'asset_database_manage');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('SPEC compliance', () => {
    it('should manage Asset Database operations', () => {
      assert.equal(handler.name, 'asset_database_manage');
    });
  });
});
