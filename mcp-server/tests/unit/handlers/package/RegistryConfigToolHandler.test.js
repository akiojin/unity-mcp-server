import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import RegistryConfigToolHandler from '../../../../src/handlers/package/RegistryConfigToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('RegistryConfigToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true
      }
    });
    handler = new RegistryConfigToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'registry_config');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('registr'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.action);
      assert.deepEqual(schema.properties.action.enum, [
        'list',
        'add_openupm',
        'add_nuget',
        'remove',
        'add_scope',
        'recommend'
      ]);
      assert.deepEqual(schema.required, ['action']);
    });
  });

  describe('validate', () => {
    it('should pass with list action', () => {
      assert.doesNotThrow(() => handler.validate({ action: 'list' }));
    });

    it('should pass with add_openupm action', () => {
      assert.doesNotThrow(() => handler.validate({ action: 'add_openupm' }));
    });

    it('should throw error for remove without registryName', () => {
      assert.throws(() => handler.validate({ action: 'remove' }), /Registry name is required/);
    });

    it('should pass with remove action and registryName', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          action: 'remove',
          registryName: 'OpenUPM'
        })
      );
    });

    it('should throw error for add_scope without registryName or scope', () => {
      assert.throws(
        () => handler.validate({ action: 'add_scope' }),
        /Registry name and scope are required/
      );
    });

    it('should pass with add_scope action and parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          action: 'add_scope',
          registryName: 'OpenUPM',
          scope: 'com.unity'
        })
      );
    });
  });

  describe('execute - list', () => {
    beforeEach(() => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          totalCount: 2,
          registries: [
            {
              name: 'Unity Registry',
              url: 'https://packages.unity.com',
              scopes: ['com.unity']
            },
            {
              name: 'OpenUPM',
              url: 'https://package.openupm.com',
              scopes: ['com.cysharp', 'jp.keijiro']
            }
          ]
        }
      });
      handler = new RegistryConfigToolHandler(mockConnection);
    });

    it('should list registries successfully', async () => {
      const result = await handler.execute({ action: 'list' });

      assert.equal(result.success, true);
      assert.equal(result.action, 'list');
      assert.equal(result.totalCount, 2);
      assert.ok(Array.isArray(result.registries));
      assert.equal(result.registries[0].name, 'Unity Registry');
    });
  });

  describe('execute - add_openupm', () => {
    beforeEach(() => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          registryUrl: 'https://package.openupm.com',
          scopes: ['com.cysharp', 'com.neuecc']
        }
      });
      handler = new RegistryConfigToolHandler(mockConnection);
    });

    it('should add OpenUPM registry successfully', async () => {
      const result = await handler.execute({ action: 'add_openupm' });

      assert.equal(result.success, true);
      assert.equal(result.action, 'add_openupm');
      assert.ok(result.registryUrl);
      assert.ok(Array.isArray(result.scopes));
      assert.ok(Array.isArray(result.instructions));
    });

    it('should add OpenUPM with auto-add popular scopes', async () => {
      await handler.execute({
        action: 'add_openupm',
        autoAddPopular: true
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.autoAddPopular, true);
    });

    it('should add OpenUPM with custom scopes', async () => {
      await handler.execute({
        action: 'add_openupm',
        scopes: ['com.custom.scope']
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.deepEqual(sentParams.scopes, ['com.custom.scope']);
    });
  });

  describe('execute - add_nuget', () => {
    beforeEach(() => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          registryUrl: 'https://unitynuget-registry.azurewebsites.net',
          scopes: ['org.nuget']
        }
      });
      handler = new RegistryConfigToolHandler(mockConnection);
    });

    it('should add NuGet registry successfully', async () => {
      const result = await handler.execute({ action: 'add_nuget' });

      assert.equal(result.success, true);
      assert.equal(result.action, 'add_nuget');
      assert.ok(result.registryUrl);
      assert.ok(Array.isArray(result.instructions));
    });
  });

  describe('execute - remove', () => {
    beforeEach(() => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true
        }
      });
      handler = new RegistryConfigToolHandler(mockConnection);
    });

    it('should remove registry successfully', async () => {
      const result = await handler.execute({
        action: 'remove',
        registryName: 'OpenUPM'
      });

      assert.equal(result.success, true);
      assert.equal(result.action, 'remove');
      assert.ok(result.message.includes('removed'));
    });
  });

  describe('execute - add_scope', () => {
    beforeEach(() => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          scopes: ['com.unity', 'com.custom']
        }
      });
      handler = new RegistryConfigToolHandler(mockConnection);
    });

    it('should add scope to registry successfully', async () => {
      const result = await handler.execute({
        action: 'add_scope',
        registryName: 'OpenUPM',
        scope: 'com.custom'
      });

      assert.equal(result.success, true);
      assert.equal(result.action, 'add_scope');
      assert.ok(Array.isArray(result.scopes));
    });
  });

  describe('execute - recommend', () => {
    beforeEach(() => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          registry: 'openupm',
          packages: [
            {
              packageId: 'com.cysharp.unitask',
              name: 'UniTask',
              description: 'Async/await for Unity',
              scope: 'com.cysharp'
            }
          ]
        }
      });
      handler = new RegistryConfigToolHandler(mockConnection);
    });

    it('should get recommendations successfully', async () => {
      const result = await handler.execute({ action: 'recommend' });

      assert.equal(result.success, true);
      assert.equal(result.action, 'recommend');
      assert.ok(Array.isArray(result.packages));
    });

    it('should get recommendations for specific registry', async () => {
      await handler.execute({
        action: 'recommend',
        registry: 'openupm'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.registry, 'openupm');
    });
  });

  describe('error handling', () => {
    it('should handle Unity errors', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Registry configuration failed'
        }
      });
      handler = new RegistryConfigToolHandler(mockConnection);

      const result = await handler.execute({ action: 'list' });

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
    it('FR-005: should support OpenUPM registry configuration', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: { success: true }
      });
      handler = new RegistryConfigToolHandler(mockConnection);

      await handler.execute({ action: 'add_openupm' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.action, 'add_openupm');
    });

    it('FR-006: should support NuGet registry configuration', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: { success: true }
      });
      handler = new RegistryConfigToolHandler(mockConnection);

      await handler.execute({ action: 'add_nuget' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.action, 'add_nuget');
    });

    it('FR-007: should support listing configured registries', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: { success: true, registries: [] }
      });
      handler = new RegistryConfigToolHandler(mockConnection);

      await handler.execute({ action: 'list' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.action, 'list');
    });

    it('FR-008: should support scope management', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: { success: true }
      });
      handler = new RegistryConfigToolHandler(mockConnection);

      await handler.execute({
        action: 'add_scope',
        registryName: 'OpenUPM',
        scope: 'com.test'
      });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.action, 'add_scope');
    });
  });
});
