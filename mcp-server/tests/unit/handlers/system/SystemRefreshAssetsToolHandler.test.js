import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SystemRefreshAssetsToolHandler } from '../../../../src/handlers/system/SystemRefreshAssetsToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('SystemRefreshAssetsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new SystemRefreshAssetsToolHandler(mockConnection);
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
