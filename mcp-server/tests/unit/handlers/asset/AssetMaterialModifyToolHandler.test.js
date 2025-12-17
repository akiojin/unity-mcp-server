import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { AssetMaterialModifyToolHandler } from '../../../../src/handlers/asset/AssetMaterialModifyToolHandler.js';
import { BaseToolHandler } from '../../../../src/handlers/base/BaseToolHandler.js';

describe('AssetMaterialModifyToolHandler', () => {
  let handler;
  let mockUnityConnection;
  let mockResults = {};

  before(() => {
    // Create mock Unity connection
    mockUnityConnection = {
      isConnected: () => true,
      connect: async () => {},
      sendCommand: async (command, params) => {
        if (mockResults[command]) {
          if (mockResults[command] instanceof Error) {
            throw mockResults[command];
          }
          return mockResults[command];
        }
        return { status: 'success' };
      }
    };
    handler = new AssetMaterialModifyToolHandler(mockUnityConnection);
  });

  after(() => {
    mockResults = {};
  });

  describe('initialization', () => {
    it('should extend BaseToolHandler', () => {
      assert.ok(handler instanceof BaseToolHandler);
    });

    it('should have correct tool name', () => {
      assert.equal(handler.name, 'modify_material');
    });

    it('should have correct description', () => {
      assert.ok(handler.description.includes('Modify properties'));
    });
  });

  describe('getDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = handler.getDefinition();

      assert.equal(definition.name, 'modify_material');
      assert.ok(definition.description.includes('Modify properties'));
      assert.equal(definition.inputSchema.type, 'object');
      assert.ok(definition.inputSchema.properties.materialPath);
      assert.ok(definition.inputSchema.properties.properties);
      assert.ok(definition.inputSchema.properties.shader);
      assert.deepEqual(definition.inputSchema.required, ['materialPath', 'properties']);
    });
  });

  describe('validate', () => {
    it('should require materialPath', () => {
      assert.throws(() => handler.validate({ properties: { _Color: [1, 0, 0, 1] } }), {
        message: 'Missing required parameter: materialPath'
      });
    });

    it('should require properties', () => {
      assert.throws(() => handler.validate({ materialPath: 'Assets/Test.mat' }), {
        message: 'Missing required parameter: properties'
      });
    });

    it('should validate materialPath format', () => {
      assert.throws(
        () =>
          handler.validate({
            materialPath: 'invalid/path',
            properties: { _Color: [1, 0, 0, 1] }
          }),
        { message: 'materialPath must start with Assets/ and end with .mat' }
      );
    });

    it('should validate properties is object', () => {
      assert.throws(
        () =>
          handler.validate({
            materialPath: 'Assets/Test.mat',
            properties: 'not an object'
          }),
        { message: 'properties must be an object' }
      );

      assert.throws(
        () =>
          handler.validate({
            materialPath: 'Assets/Test.mat',
            properties: []
          }),
        { message: 'properties must be an object' }
      );
    });

    it('should validate properties is not empty', () => {
      assert.throws(
        () =>
          handler.validate({
            materialPath: 'Assets/Test.mat',
            properties: {}
          }),
        { message: 'properties cannot be empty' }
      );
    });

    it('should validate shader when provided', () => {
      assert.throws(
        () =>
          handler.validate({
            materialPath: 'Assets/Test.mat',
            properties: { _Color: [1, 0, 0, 1] },
            shader: ''
          }),
        { message: 'shader cannot be empty when provided' }
      );
    });

    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() => {
        handler.validate({
          materialPath: 'Assets/Materials/Test.mat',
          properties: { _Color: [1, 0, 0, 1] }
        });
      });

      assert.doesNotThrow(() => {
        handler.validate({
          materialPath: 'Assets/Materials/Test.mat',
          properties: { _Metallic: 0.5 },
          shader: 'Standard'
        });
      });
    });
  });

  describe('execute', () => {
    it('should modify material properties', async () => {
      mockResults.modify_material = {
        success: true,
        materialPath: 'Assets/Materials/Test.mat',
        propertiesModified: ['_Color', '_Metallic']
      };

      const result = await handler.execute({
        materialPath: 'Assets/Materials/Test.mat',
        properties: {
          _Color: [1, 0, 0, 1],
          _Metallic: 0.5
        }
      });

      assert.equal(result.success, true);
      assert.deepEqual(result.propertiesModified, ['_Color', '_Metallic']);
    });

    it('should change shader when specified', async () => {
      mockResults.modify_material = {
        success: true,
        materialPath: 'Assets/Materials/Test.mat',
        shaderChanged: true,
        newShader: 'Unlit/Color'
      };

      const result = await handler.execute({
        materialPath: 'Assets/Materials/Test.mat',
        properties: { _Color: [1, 1, 1, 1] },
        shader: 'Unlit/Color'
      });

      assert.equal(result.shaderChanged, true);
      assert.equal(result.newShader, 'Unlit/Color');
    });

    it('should set texture properties', async () => {
      mockResults.modify_material = {
        success: true,
        materialPath: 'Assets/Materials/Test.mat',
        propertiesModified: ['_MainTex']
      };

      const result = await handler.execute({
        materialPath: 'Assets/Materials/Test.mat',
        properties: {
          _MainTex: 'Assets/Textures/wood.png'
        }
      });

      assert.deepEqual(result.propertiesModified, ['_MainTex']);
    });

    it('should connect if not connected', async () => {
      let connectCalled = false;
      mockUnityConnection.isConnected = () => false;
      mockUnityConnection.connect = async () => {
        connectCalled = true;
      };

      mockResults.modify_material = { success: true };

      await handler.execute({
        materialPath: 'Assets/Test.mat',
        properties: { _Color: [0, 0, 0, 1] }
      });
      assert.ok(connectCalled);

      // Reset
      mockUnityConnection.isConnected = () => true;
    });

    it('should handle Unity errors', async () => {
      mockResults.modify_material = new Error('Material not found');

      await assert.rejects(
        handler.execute({
          materialPath: 'Assets/Test.mat',
          properties: { _Color: [0, 0, 0, 1] }
        }),
        { message: 'Material not found' }
      );
    });
  });

  describe('handle', () => {
    it('should return success response for valid modification', async () => {
      mockResults.modify_material = {
        success: true,
        materialPath: 'Assets/Materials/Test.mat',
        propertiesModified: ['_Color']
      };

      const response = await handler.handle({
        materialPath: 'Assets/Materials/Test.mat',
        properties: { _Color: [1, 0, 0, 1] }
      });

      assert.equal(response.status, 'success');
      assert.equal(response.result.materialPath, 'Assets/Materials/Test.mat');
      assert.deepEqual(response.result.propertiesModified, ['_Color']);
    });

    it('should return error response for invalid parameters', async () => {
      const response = await handler.handle({
        materialPath: 'invalid',
        properties: { _Color: [1, 0, 0, 1] }
      });

      assert.equal(response.status, 'error');
      assert.equal(response.code, 'TOOL_ERROR');
      assert.ok(response.error.includes('materialPath must start with Assets/'));
    });

    it('should return error response for empty properties', async () => {
      const response = await handler.handle({
        materialPath: 'Assets/Test.mat',
        properties: {}
      });

      assert.equal(response.status, 'error');
      assert.equal(response.code, 'TOOL_ERROR');
      assert.ok(response.error.includes('properties cannot be empty'));
    });
  });
});
