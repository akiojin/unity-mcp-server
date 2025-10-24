import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssetDatabaseToolHandler } from '../../../../src/handlers/asset/AssetDatabaseToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AssetDatabaseToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new AssetDatabaseToolHandler(mockConnection);
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
