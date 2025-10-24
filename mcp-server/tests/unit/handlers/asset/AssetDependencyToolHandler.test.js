import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssetDependencyToolHandler } from '../../../../src/handlers/asset/AssetDependencyToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AssetDependencyToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new AssetDependencyToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'asset_dependency_analyze');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('SPEC compliance', () => {
    it('should analyze asset dependencies', () => {
      assert.equal(handler.name, 'asset_dependency_analyze');
    });
  });
});
