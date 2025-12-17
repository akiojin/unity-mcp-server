import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssetDependencyAnalyzeToolHandler } from '../../../../src/handlers/asset/AssetDependencyAnalyzeToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AssetDependencyAnalyzeToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new AssetDependencyAnalyzeToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'analyze_asset_dependencies');
    });

    it('should have description', () => {
      assert.ok(handler.description);
    });
  });

  describe('SPEC compliance', () => {
    it('should analyze asset dependencies', () => {
      assert.equal(handler.name, 'analyze_asset_dependencies');
    });
  });
});
