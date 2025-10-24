import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GetProjectSettingsToolHandler } from '../../../src/handlers/settings/GetProjectSettingsToolHandler.js';

describe('GetProjectSettingsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    // Create a mock Unity connection
    mockConnection = {
      isConnected: () => true,
      connect: async () => {},
      sendCommand: async (command, params) => {
        // Mock successful response
        if (command === 'get_project_settings') {
          const result = {};
          
          if (params.includePlayer !== false) {
            result.player = {
              companyName: 'Test Company',
              productName: 'Test Product',
              version: '1.0.0'
            };
          }
          
          if (params.includeGraphics) {
            result.graphics = {
              colorSpace: 'Linear',
              renderPipelineAsset: 'URP'
            };
          }
          
          if (params.includeQuality) {
            result.quality = {
              currentLevel: 'High',
              vSyncCount: 1
            };
          }
          
          return result;
        }
        throw new Error(`Unknown command: ${command}`);
      }
    };
    
    handler = new GetProjectSettingsToolHandler(mockConnection);
  });

  describe('validate', () => {
    it('should pass validation with no parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });

    it('should pass validation with boolean parameters', () => {
      assert.doesNotThrow(() => handler.validate({
        includePlayer: true,
        includeGraphics: false,
        includeQuality: true
      }));
    });

    it('should fail validation with non-boolean parameters', () => {
      assert.throws(
        () => handler.validate({ includePlayer: 'yes' }),
        /includePlayer must be a boolean value/
      );
    });
  });

  describe('execute', () => {
    it('should get player settings by default', async () => {
      const result = await handler.execute({});
      
      assert.ok(result.player);
      assert.equal(result.player.companyName, 'Test Company');
      assert.equal(result.player.productName, 'Test Product');
      assert.equal(result.player.version, '1.0.0');
      assert.ok(!result.graphics);
      assert.ok(!result.quality);
    });

    it('should get selected settings when specified', async () => {
      const result = await handler.execute({
        includePlayer: false,
        includeGraphics: true,
        includeQuality: true
      });
      
      assert.ok(!result.player);
      assert.ok(result.graphics);
      assert.equal(result.graphics.colorSpace, 'Linear');
      assert.ok(result.quality);
      assert.equal(result.quality.currentLevel, 'High');
    });

    it('should handle Unity errors', async () => {
      mockConnection.sendCommand = async () => {
        return { error: 'Unity error occurred' };
      };
      
      await assert.rejects(
        async () => await handler.execute({}),
        /Unity error occurred/
      );
    });

    it('should connect if not connected', async () => {
      let connectCalled = false;
      mockConnection.isConnected = () => false;
      mockConnection.connect = async () => { connectCalled = true; };
      
      await handler.execute({});
      assert.ok(connectCalled);
    });
  });

  describe('getExamples', () => {
    it('should return example usage scenarios', () => {
      const examples = handler.getExamples();
      
      assert.ok(examples.getBasicSettings);
      assert.ok(examples.getGraphicsAndQuality);
      assert.ok(examples.getPhysicsSettings);
      assert.ok(examples.getEditorSettings);
      assert.ok(examples.getAllSettings);
    });
  });

  describe('schema', () => {
    it('should have correct schema definition', () => {
      assert.equal(handler.name, 'settings_get');
      assert.ok(handler.description);
      assert.equal(handler.inputSchema.type, 'object');
      assert.ok(handler.inputSchema.properties.includePlayer);
      assert.ok(handler.inputSchema.properties.includeGraphics);
      assert.ok(handler.inputSchema.properties.includeQuality);
    });
  });
});