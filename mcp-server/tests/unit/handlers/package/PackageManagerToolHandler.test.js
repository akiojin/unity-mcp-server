import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import PackageManagerToolHandler from '../../../../src/handlers/package/PackageManagerToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('PackageManagerToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true
      }
    });
    handler = new PackageManagerToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'manage_packages');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('package'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.action);
      assert.deepEqual(schema.properties.action.enum, [
        'search',
        'list',
        'install',
        'remove',
        'info',
        'recommend'
      ]);
      assert.deepEqual(schema.required, ['action']);
    });
  });

  describe('validate', () => {
    it('should pass with list action', () => {
      assert.doesNotThrow(() => handler.validate({ action: 'list' }));
    });

    it('should pass with search action and keyword', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          action: 'search',
          keyword: 'timeline'
        })
      );
    });

    it('should throw error for search without keyword', () => {
      assert.throws(() => handler.validate({ action: 'search' }), /keyword is required/);
    });

    it('should pass with install action and packageId', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          action: 'install',
          packageId: 'com.unity.textmeshpro'
        })
      );
    });

    it('should throw error for install without packageId', () => {
      assert.throws(() => handler.validate({ action: 'install' }), /Package ID is required/);
    });

    it('should pass with remove action and packageName', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          action: 'remove',
          packageName: 'com.unity.timeline'
        })
      );
    });

    it('should throw error for remove without packageName', () => {
      assert.throws(() => handler.validate({ action: 'remove' }), /Package name is required/);
    });
  });

  describe('execute - search', () => {
    beforeEach(() => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          keyword: 'timeline',
          totalCount: 2,
          packages: [
            {
              packageId: 'com.unity.timeline',
              name: 'Timeline',
              displayName: 'Unity Timeline',
              description: 'A tool for creating cinematic content',
              version: '1.7.1',
              category: 'Animation'
            }
          ]
        }
      });
      handler = new PackageManagerToolHandler(mockConnection);
    });

    it('should search packages successfully', async () => {
      const result = await handler.execute({
        action: 'search',
        keyword: 'timeline'
      });

      assert.equal(result.success, true);
      assert.equal(result.action, 'search');
      assert.equal(result.keyword, 'timeline');
      assert.equal(result.totalCount, 2);
      assert.ok(Array.isArray(result.packages));
    });
  });

  describe('execute - list', () => {
    beforeEach(() => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          totalCount: 3,
          packages: [
            {
              packageId: 'com.unity.textmeshpro',
              name: 'TextMeshPro',
              displayName: 'TextMeshPro',
              version: '3.0.6',
              source: 'Registry',
              isDirectDependency: true
            }
          ]
        }
      });
      handler = new PackageManagerToolHandler(mockConnection);
    });

    it('should list installed packages successfully', async () => {
      const result = await handler.execute({ action: 'list' });

      assert.equal(result.success, true);
      assert.equal(result.action, 'list');
      assert.equal(result.totalCount, 3);
      assert.ok(Array.isArray(result.packages));
    });

    it('should list with includeBuiltIn option', async () => {
      await handler.execute({
        action: 'list',
        includeBuiltIn: true
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.includeBuiltIn, true);
    });
  });

  describe('execute - install', () => {
    beforeEach(() => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          packageId: 'com.unity.textmeshpro',
          name: 'TextMeshPro',
          displayName: 'TextMeshPro',
          version: '3.0.6'
        }
      });
      handler = new PackageManagerToolHandler(mockConnection);
    });

    it('should install package successfully', async () => {
      const result = await handler.execute({
        action: 'install',
        packageId: 'com.unity.textmeshpro'
      });

      assert.equal(result.success, true);
      assert.equal(result.action, 'install');
      assert.equal(result.packageId, 'com.unity.textmeshpro');
      assert.ok(result.message.includes('installed'));
    });

    it('should install specific version', async () => {
      await handler.execute({
        action: 'install',
        packageId: 'com.unity.timeline',
        version: '1.7.1'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.version, '1.7.1');
    });
  });

  describe('execute - remove', () => {
    beforeEach(() => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          packageName: 'com.unity.timeline'
        }
      });
      handler = new PackageManagerToolHandler(mockConnection);
    });

    it('should remove package successfully', async () => {
      const result = await handler.execute({
        action: 'remove',
        packageName: 'com.unity.timeline'
      });

      assert.equal(result.success, true);
      assert.equal(result.action, 'remove');
      assert.equal(result.packageName, 'com.unity.timeline');
      assert.ok(result.message.includes('removed'));
    });
  });

  describe('execute - info', () => {
    beforeEach(() => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          package: {
            packageId: 'com.unity.textmeshpro',
            name: 'TextMeshPro',
            displayName: 'TextMeshPro',
            version: '3.0.6',
            description: 'A comprehensive text solution for Unity',
            author: 'Unity Technologies'
          }
        }
      });
      handler = new PackageManagerToolHandler(mockConnection);
    });

    it('should get package info successfully', async () => {
      const result = await handler.execute({
        action: 'info',
        packageName: 'com.unity.textmeshpro'
      });

      assert.equal(result.success, true);
      assert.equal(result.action, 'info');
      assert.ok(result.package);
      assert.equal(result.package.name, 'TextMeshPro');
    });
  });

  describe('execute - recommend', () => {
    beforeEach(() => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          category: 'essential',
          packages: [{ packageId: 'com.unity.textmeshpro', recommended: true }]
        }
      });
      handler = new PackageManagerToolHandler(mockConnection);
    });

    it('should get package recommendations successfully', async () => {
      const result = await handler.execute({
        action: 'recommend',
        category: 'essential'
      });

      assert.equal(result.success, true);
      assert.equal(result.action, 'recommend');
      assert.equal(result.category, 'essential');
    });
  });

  describe('error handling', () => {
    it('should handle Unity errors', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Package not found'
        }
      });
      handler = new PackageManagerToolHandler(mockConnection);

      const result = await handler.execute({
        action: 'info',
        packageName: 'invalid.package'
      });

      assert.equal(result.success, false);
      assert.ok(result.error);
    });

    it('should connect if not already connected', async () => {
      mockConnection.isConnected.mock.mockImplementationOnce(() => false);

      await handler.execute({ action: 'list' });

      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('SPEC-9f4b1a7c compliance', () => {
    it('FR-001: should support package search', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: { success: true, totalCount: 1, packages: [] }
      });
      handler = new PackageManagerToolHandler(mockConnection);

      await handler.execute({ action: 'search', keyword: 'test' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.action, 'search');
    });

    it('FR-002: should support package installation', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: { success: true, packageId: 'test' }
      });
      handler = new PackageManagerToolHandler(mockConnection);

      await handler.execute({ action: 'install', packageId: 'test' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.action, 'install');
    });

    it('FR-003: should support package removal', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: { success: true }
      });
      handler = new PackageManagerToolHandler(mockConnection);

      await handler.execute({ action: 'remove', packageName: 'test' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.action, 'remove');
    });

    it('FR-004: should support listing packages', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: { success: true, packages: [] }
      });
      handler = new PackageManagerToolHandler(mockConnection);

      await handler.execute({ action: 'list' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.action, 'list');
    });
  });
});
