import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssetImportSettingsToolHandler } from '../../../src/handlers/asset/AssetImportSettingsToolHandler.js';

describe('AssetImportSettingsToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: () => true,
      connect: async () => {},
      sendCommand: async (command, params) => {
        if (command === 'manage_asset_import_settings') {
          const action = params.action;
          
          if (action === 'get') {
            const assetPath = params.assetPath;
            if (assetPath === 'Assets/Textures/icon.png') {
              return {
                success: true,
                action: 'get',
                assetPath: assetPath,
                settings: {
                  assetType: 'Texture2D',
                  textureType: 'Sprite',
                  filterMode: 'Bilinear',
                  wrapMode: 'Clamp',
                  maxTextureSize: 2048,
                  compressionQuality: 50,
                  generateMipMaps: false,
                  readable: false,
                  crunchedCompression: false,
                  sRGBTexture: true
                }
              };
            }
            if (assetPath === 'Assets/Models/character.fbx') {
              return {
                success: true,
                action: 'get',
                assetPath: assetPath,
                settings: {
                  assetType: 'Model',
                  scaleFactor: 1.0,
                  useFileScale: true,
                  importBlendShapes: true,
                  importVisibility: true,
                  importCameras: false,
                  importLights: false,
                  generateColliders: false,
                  animationType: 'Humanoid',
                  optimizeMesh: true
                }
              };
            }
            if (assetPath === 'Assets/NonExistent.png') {
              throw new Error('Asset not found: Assets/NonExistent.png');
            }
          }
          
          if (action === 'modify') {
            const assetPath = params.assetPath;
            if (assetPath === 'Assets/Textures/icon.png') {
              return {
                success: true,
                action: 'modify',
                assetPath: assetPath,
                previousSettings: {
                  maxTextureSize: 2048,
                  compressionQuality: 50
                },
                newSettings: params.settings,
                message: 'Import settings modified for: Assets/Textures/icon.png'
              };
            }
            if (assetPath === 'Assets/NonExistent.png') {
              throw new Error('Asset not found: Assets/NonExistent.png');
            }
          }
          
          if (action === 'apply_preset') {
            const assetPath = params.assetPath;
            const preset = params.preset;
            if (assetPath === 'Assets/Textures/icon.png' && preset === 'UI_Sprite') {
              return {
                success: true,
                action: 'apply_preset',
                assetPath: assetPath,
                preset: preset,
                appliedSettings: {
                  textureType: 'Sprite',
                  filterMode: 'Bilinear',
                  maxTextureSize: 2048,
                  generateMipMaps: false
                },
                message: 'Preset "UI_Sprite" applied to: Assets/Textures/icon.png'
              };
            }
            if (preset === 'InvalidPreset') {
              throw new Error('Unknown preset: InvalidPreset');
            }
          }
          
          if (action === 'reimport') {
            const assetPath = params.assetPath;
            if (assetPath === 'Assets/Textures/icon.png') {
              return {
                success: true,
                action: 'reimport',
                assetPath: assetPath,
                message: 'Asset reimported: Assets/Textures/icon.png',
                duration: 0.245
              };
            }
          }
        }
        
        throw new Error('Unknown command');
      }
    };

    handler = new AssetImportSettingsToolHandler(mockUnityConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'manage_asset_import_settings');
      assert.equal(handler.description, 'Manage Unity asset import settings (get, modify, apply presets, reimport)');
      assert.ok(handler.inputSchema);
      assert.equal(handler.inputSchema.type, 'object');
    });
  });

  describe('validate', () => {
    it('should validate get action with assetPath', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get', assetPath: 'Assets/Textures/icon.png' });
      });
    });

    it('should validate modify action with assetPath and settings', () => {
      assert.doesNotThrow(() => {
        handler.validate({ 
          action: 'modify', 
          assetPath: 'Assets/Textures/icon.png',
          settings: { maxTextureSize: 1024 }
        });
      });
    });

    it('should validate apply_preset action with assetPath and preset', () => {
      assert.doesNotThrow(() => {
        handler.validate({ 
          action: 'apply_preset', 
          assetPath: 'Assets/Textures/icon.png',
          preset: 'UI_Sprite'
        });
      });
    });

    it('should validate reimport action with assetPath', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'reimport', assetPath: 'Assets/Textures/icon.png' });
      });
    });

    it('should fail without action', () => {
      assert.throws(() => {
        handler.validate({ assetPath: 'Assets/Textures/icon.png' });
      }, { message: /action is required/ });
    });

    it('should fail with invalid action', () => {
      assert.throws(() => {
        handler.validate({ action: 'invalid', assetPath: 'Assets/Textures/icon.png' });
      }, { message: /action must be one of: get, modify, apply_preset, reimport/ });
    });

    it('should fail without assetPath', () => {
      assert.throws(() => {
        handler.validate({ action: 'get' });
      }, { message: /assetPath is required/ });
    });

    it('should fail with empty assetPath', () => {
      assert.throws(() => {
        handler.validate({ action: 'get', assetPath: '' });
      }, { message: /assetPath cannot be empty/ });
    });

    it('should fail modify without settings', () => {
      assert.throws(() => {
        handler.validate({ action: 'modify', assetPath: 'Assets/Textures/icon.png' });
      }, { message: /settings is required for modify action/ });
    });

    it('should fail apply_preset without preset', () => {
      assert.throws(() => {
        handler.validate({ action: 'apply_preset', assetPath: 'Assets/Textures/icon.png' });
      }, { message: /preset is required for apply_preset action/ });
    });

    it('should fail with empty preset', () => {
      assert.throws(() => {
        handler.validate({ action: 'apply_preset', assetPath: 'Assets/Textures/icon.png', preset: '' });
      }, { message: /preset cannot be empty/ });
    });

    it('should validate assetPath with Assets prefix', () => {
      assert.throws(() => {
        handler.validate({ action: 'get', assetPath: 'Textures/icon.png' });
      }, { message: /assetPath must start with "Assets\/"/ });
    });
  });

  describe('execute', () => {
    it('should get texture import settings successfully', async () => {
      const result = await handler.execute({ 
        action: 'get', 
        assetPath: 'Assets/Textures/icon.png' 
      });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'get');
      assert.equal(result.assetPath, 'Assets/Textures/icon.png');
      assert.equal(result.settings.assetType, 'Texture2D');
      assert.equal(result.settings.textureType, 'Sprite');
      assert.equal(result.settings.maxTextureSize, 2048);
    });

    it('should get model import settings successfully', async () => {
      const result = await handler.execute({ 
        action: 'get', 
        assetPath: 'Assets/Models/character.fbx' 
      });
      
      assert.equal(result.success, true);
      assert.equal(result.settings.assetType, 'Model');
      assert.equal(result.settings.scaleFactor, 1.0);
      assert.equal(result.settings.animationType, 'Humanoid');
    });

    it('should modify import settings successfully', async () => {
      const result = await handler.execute({ 
        action: 'modify', 
        assetPath: 'Assets/Textures/icon.png',
        settings: {
          maxTextureSize: 1024,
          compressionQuality: 75
        }
      });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'modify');
      assert.ok(result.previousSettings);
      assert.ok(result.newSettings);
      assert.ok(result.message.includes('modified'));
    });

    it('should apply preset successfully', async () => {
      const result = await handler.execute({ 
        action: 'apply_preset', 
        assetPath: 'Assets/Textures/icon.png',
        preset: 'UI_Sprite'
      });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'apply_preset');
      assert.equal(result.preset, 'UI_Sprite');
      assert.ok(result.appliedSettings);
      assert.ok(result.message.includes('applied'));
    });

    it('should reimport asset successfully', async () => {
      const result = await handler.execute({ 
        action: 'reimport', 
        assetPath: 'Assets/Textures/icon.png'
      });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'reimport');
      assert.ok(result.message.includes('reimported'));
      assert.ok(typeof result.duration === 'number');
    });

    it('should handle non-existent asset', async () => {
      await assert.rejects(
        handler.execute({ action: 'get', assetPath: 'Assets/NonExistent.png' }),
        { message: /Asset not found: Assets\/NonExistent.png/ }
      );
    });

    it('should handle invalid preset', async () => {
      await assert.rejects(
        handler.execute({ 
          action: 'apply_preset', 
          assetPath: 'Assets/Textures/icon.png',
          preset: 'InvalidPreset'
        }),
        { message: /Unknown preset: InvalidPreset/ }
      );
    });
  });

  describe('getExamples', () => {
    it('should return array of examples', () => {
      const examples = handler.getExamples();
      assert.ok(Array.isArray(examples));
      assert.ok(examples.length >= 4);
      
      // Check first example structure
      const firstExample = examples[0];
      assert.ok(firstExample.input);
      assert.ok(firstExample.output);
      assert.equal(firstExample.input.action, 'get');
    });

    it('should include examples for all actions', () => {
      const examples = handler.getExamples();
      const actions = examples.map(e => e.input.action);
      
      assert.ok(actions.includes('get'));
      assert.ok(actions.includes('modify'));
      assert.ok(actions.includes('apply_preset'));
      assert.ok(actions.includes('reimport'));
    });
  });
});