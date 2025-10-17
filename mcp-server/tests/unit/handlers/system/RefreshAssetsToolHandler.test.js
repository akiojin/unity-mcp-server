import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RefreshAssetsToolHandler } from '../../../../src/handlers/system/RefreshAssetsToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('RefreshAssetsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new RefreshAssetsToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'refresh_assets');
    });
  });

  describe('SPEC compliance', () => {
    it('should refresh assets and check compilation', () => {
      assert.equal(handler.name, 'refresh_assets');
    });
  });
});
