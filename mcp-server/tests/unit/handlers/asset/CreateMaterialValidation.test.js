import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AssetMaterialCreateToolHandler } from '../../../../src/handlers/asset/AssetMaterialCreateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AssetMaterialCreateToolHandler - Extended Validation Tests', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        id: 'material_123',
        name: 'TestMaterial',
        path: 'Assets/Materials/TestMaterial.mat',
        shader: 'Standard',
        properties: {}
      }
    });
    handler = new AssetMaterialCreateToolHandler(mockConnection);
  });

  describe('advanced validation scenarios', () => {
    it('should validate materialPath format strictly', () => {
      // Invalid paths that don't start with Assets/
      assert.throws(
        () => handler.validate({ materialPath: 'Materials/TestMaterial.mat' }),
        /materialPath must start with Assets\//
      );

      // Invalid paths that don't end with .mat
      assert.throws(
        () => handler.validate({ materialPath: 'Assets/Materials/TestMaterial' }),
        /materialPath must start with Assets\/ and end with \.mat/
      );

      assert.throws(
        () => handler.validate({ materialPath: 'Assets/Materials/TestMaterial.prefab' }),
        /materialPath must start with Assets\/ and end with \.mat/
      );

      // Valid paths should pass
      assert.doesNotThrow(() => handler.validate({
        materialPath: 'Assets/Materials/TestMaterial.mat'
      }));
    });

    it('should validate properties object structure', () => {
      // Properties must be an object if provided
      assert.throws(
        () => handler.validate({
          materialPath: 'Assets/Materials/Test.mat',
          properties: 'invalid'
        }),
        /properties must be an object/
      );

      assert.throws(
        () => handler.validate({
          materialPath: 'Assets/Materials/Test.mat',
          properties: null
        }),
        /properties must be an object/
      );

      // Valid object should pass
      assert.doesNotThrow(() => handler.validate({
        materialPath: 'Assets/Materials/Test.mat',
        properties: { _Color: { r: 1, g: 0, b: 0, a: 1 } }
      }));
    });

    it('should validate empty shader', () => {
      assert.throws(
        () => handler.validate({
          materialPath: 'Assets/Materials/Test.mat',
          shader: ''
        }),
        /shader cannot be empty when provided/
      );

      assert.doesNotThrow(() => handler.validate({
        materialPath: 'Assets/Materials/Test.mat',
        shader: 'Standard'
      }));
    });

    it('should validate copyFrom parameter format', () => {
      assert.throws(
        () => handler.validate({
          materialPath: 'Assets/Materials/Test.mat',
          copyFrom: ''
        }),
        /copyFrom cannot be empty when provided/
      );

      assert.throws(
        () => handler.validate({
          materialPath: 'Assets/Materials/Test.mat',
          copyFrom: 'InvalidPath.mat'
        }),
        /copyFrom must be a valid material path/
      );

      assert.doesNotThrow(() => handler.validate({
        materialPath: 'Assets/Materials/Test.mat',
        copyFrom: 'Assets/Materials/ExistingMaterial.mat'
      }));
    });

    it('should handle missing required materialPath', () => {
      assert.throws(
        () => handler.validate({}),
        /materialPath is required/
      );

      assert.throws(
        () => handler.validate({ shader: 'Standard' }),
        /materialPath is required/
      );
    });

    it('should validate complex property structures', () => {
      const complexProperties = {
        _Color: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
        _MainTex: 'texture_path.png',
        _Metallic: 0.5,
        _Smoothness: 0.8,
        _EmissionColor: { r: 0.0, g: 1.0, b: 0.0, a: 1.0 }
      };

      assert.doesNotThrow(() => handler.validate({
        materialPath: 'Assets/Materials/Complex.mat',
        properties: complexProperties
      }));
    });

    it('should validate edge cases for path formatting', () => {
      // Paths with spaces
      assert.doesNotThrow(() => handler.validate({
        materialPath: 'Assets/Materials/My Material.mat'
      }));

      // Nested directories
      assert.doesNotThrow(() => handler.validate({
        materialPath: 'Assets/Materials/Weapons/Sword/SwordMaterial.mat'
      }));

      // Empty string should fail
      assert.throws(
        () => handler.validate({ materialPath: '' }),
        /materialPath must start with Assets\//
      );
    });
  });

  describe('execution error scenarios', () => {
    it('should handle Unity connection failures', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      mockConnection.connect.mock.mockImplementation(async () => {
        throw new Error('Connection failed');
      });

      await assert.rejects(
        async () => await handler.execute({
          materialPath: 'Assets/Materials/Test.mat'
        }),
        /Connection failed/
      );
    });

    it('should handle Unity command errors', async () => {
      mockConnection.sendCommand.mock.mockImplementation(async () => {
        throw new Error('Material creation failed: Path already exists');
      });

      await assert.rejects(
        async () => await handler.execute({
          materialPath: 'Assets/Materials/Test.mat'
        }),
        /Material creation failed: Path already exists/
      );
    });

    it('should handle Unity error responses', async () => {
      mockConnection.sendCommand.mock.mockImplementation(async () => ({
        error: 'Invalid shader: NonExistentShader'
      }));

      const result = await handler.execute({
        materialPath: 'Assets/Materials/Test.mat',
        shader: 'NonExistentShader'
      });

      // The handler just returns whatever Unity returns, including errors
      assert.equal(result.error, 'Invalid shader: NonExistentShader');
    });

    it('should handle Unity responses correctly', async () => {
      const result = await handler.execute({
        materialPath: 'Assets/Materials/Test.mat'
      });

      // Should return the mock result
      assert.equal(result.name, 'TestMaterial');
      assert.equal(result.path, 'Assets/Materials/TestMaterial.mat');
    });

    it('should pass all parameters correctly to Unity', async () => {
      const params = {
        materialPath: 'Assets/Materials/CustomMaterial.mat',
        shader: 'Custom/MyShader',
        properties: {
          _Color: { r: 1, g: 0, b: 0, a: 1 },
          _MainTex: 'texture.png'
        },
        copyFrom: 'Assets/Materials/BaseMaterial.mat',
        overwrite: true
      };

      await handler.execute(params);

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      
      assert.equal(sentParams.materialPath, params.materialPath);
      assert.equal(sentParams.shader, params.shader);
      assert.deepEqual(sentParams.properties, params.properties);
      assert.equal(sentParams.copyFrom, params.copyFrom);
      assert.equal(sentParams.overwrite, params.overwrite);
    });
  });

  describe('boundary value testing', () => {
    it('should handle very long material paths', () => {
      const longPath = 'Assets/Materials/' + 'A'.repeat(200) + '.mat';
      
      assert.doesNotThrow(() => handler.validate({
        materialPath: longPath
      }));
    });

    it('should handle deeply nested properties', () => {
      const deepProperties = {
        level1: {
          level2: {
            level3: {
              value: 1.0
            }
          }
        }
      };

      assert.doesNotThrow(() => handler.validate({
        materialPath: 'Assets/Materials/Deep.mat',
        properties: deepProperties
      }));
    });

    it('should handle large property objects', () => {
      const largeProperties = {};
      for (let i = 0; i < 100; i++) {
        largeProperties[`property_${i}`] = Math.random();
      }

      assert.doesNotThrow(() => handler.validate({
        materialPath: 'Assets/Materials/Large.mat',
        properties: largeProperties
      }));
    });
  });

  describe('parameter combinations', () => {
    it('should work with minimal parameters', async () => {
      await handler.execute({
        materialPath: 'Assets/Materials/Minimal.mat'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.materialPath, 'Assets/Materials/Minimal.mat');
      assert.equal(sentParams.shader, undefined);
      assert.equal(sentParams.properties, undefined);
    });

    it('should work with all parameters', async () => {
      const fullParams = {
        materialPath: 'Assets/Materials/Full.mat',
        shader: 'Standard',
        properties: { _Color: { r: 1, g: 1, b: 1, a: 1 } },
        copyFrom: 'Assets/Materials/Base.mat',
        overwrite: true
      };

      await handler.execute(fullParams);

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.deepEqual(sentParams, fullParams);
    });
  });
});