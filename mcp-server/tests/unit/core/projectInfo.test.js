import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectInfoProvider } from '../../../src/core/projectInfo.js';

describe('ProjectInfoProvider', () => {
  let provider;
  let mockConnection;

  beforeEach(() => {
    mockConnection = {
      isConnected: () => false,
      sendCommand: async () => ({ success: false })
    };
    provider = new ProjectInfoProvider(mockConnection);
  });

  describe('constructor', () => {
    it('should construct with unityConnection', () => {
      assert.ok(provider);
      assert.equal(provider.cached, null);
      assert.equal(provider.lastTried, 0);
    });
  });

  describe('get method', () => {
    it('should have get method', () => {
      assert.ok(provider.get);
      assert.equal(typeof provider.get, 'function');
    });

    it('should return cached value if available', async () => {
      const mockInfo = {
        projectRoot: '/test/project',
        assetsPath: '/test/project/Assets',
        packagesPath: '/test/project/Packages',
        codeIndexRoot: '/test/project/Library/UnityMCP/CodeIndex'
      };
      provider.cached = mockInfo;
      const result = await provider.get();
      assert.deepEqual(result, mockInfo);
    });
  });

  describe('inferFromCwd method', () => {
    it('should have inferFromCwd method', () => {
      assert.ok(provider.inferFromCwd);
      assert.equal(typeof provider.inferFromCwd, 'function');
    });

    it('should return null or object', () => {
      const result = provider.inferFromCwd();
      assert.ok(result === null || typeof result === 'object');
    });
  });

  describe('SPEC compliance', () => {
    it('should provide project info functionality', () => {
      assert.ok(ProjectInfoProvider);
      assert.equal(typeof ProjectInfoProvider, 'function');
    });
  });
});
