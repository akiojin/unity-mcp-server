import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssetDatabaseToolHandler } from '../../../src/handlers/asset/AssetDatabaseToolHandler.js';

describe('AssetDatabaseToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: () => true,
      connect: async () => {},
      sendCommand: async (command, params) => {
        if (command === 'manage_asset_database') {
          const action = params.action;
          
          if (action === 'find_assets') {
            const filter = params.filter;
            const searchInFolders = params.searchInFolders || [];
            
            if (filter === 't:Texture2D') {
              return {
                success: true,
                action: 'find_assets',
                filter: filter,
                searchInFolders: searchInFolders,
                assets: [
                  {
                    path: 'Assets/Textures/icon.png',
                    name: 'icon',
                    type: 'Texture2D',
                    guid: 'abc123',
                    size: 1024
                  },
                  {
                    path: 'Assets/UI/button.png',
                    name: 'button',
                    type: 'Texture2D',
                    guid: 'def456',
                    size: 2048
                  }
                ],
                count: 2
              };
            }
            
            if (filter === 't:AudioClip wav') {
              return {
                success: true,
                action: 'find_assets',
                filter: filter,
                assets: [
                  {
                    path: 'Assets/Audio/music.wav',
                    name: 'music',
                    type: 'AudioClip',
                    guid: 'ghi789',
                    size: 8192
                  }
                ],
                count: 1
              };
            }
            
            if (filter === 'InvalidFilter') {
              throw new Error('Invalid filter syntax: InvalidFilter');
            }
          }
          
          if (action === 'get_asset_info') {
            const assetPath = params.assetPath;
            
            if (assetPath === 'Assets/Textures/icon.png') {
              return {
                success: true,
                action: 'get_asset_info',
                assetPath: assetPath,
                info: {
                  name: 'icon',
                  type: 'Texture2D',
                  guid: 'abc123',
                  size: 1024,
                  lastModified: '2024-01-15T10:30:00Z',
                  importSettings: {
                    textureType: 'Sprite',
                    maxTextureSize: 2048
                  },
                  dependencies: ['Assets/Materials/UIMaterial.mat'],
                  isValid: true
                }
              };
            }
            
            if (assetPath === 'Assets/NonExistent.png') {
              throw new Error('Asset not found: Assets/NonExistent.png');
            }
          }
          
          if (action === 'create_folder') {
            const folderPath = params.folderPath;
            
            if (folderPath === 'Assets/NewFolder') {
              return {
                success: true,
                action: 'create_folder',
                folderPath: folderPath,
                guid: 'folder123',
                message: 'Folder created: Assets/NewFolder'
              };
            }
            
            if (folderPath === 'Assets/Textures') {
              throw new Error('Folder already exists: Assets/Textures');
            }
          }
          
          if (action === 'delete_asset') {
            const assetPath = params.assetPath;
            
            if (assetPath === 'Assets/Textures/old_icon.png') {
              return {
                success: true,
                action: 'delete_asset',
                assetPath: assetPath,
                message: 'Asset deleted: Assets/Textures/old_icon.png'
              };
            }
            
            if (assetPath === 'Assets/NonExistent.png') {
              throw new Error('Asset not found: Assets/NonExistent.png');
            }
          }
          
          if (action === 'move_asset') {
            const fromPath = params.fromPath;
            const toPath = params.toPath;
            
            if (fromPath === 'Assets/icon.png' && toPath === 'Assets/Textures/icon.png') {
              return {
                success: true,
                action: 'move_asset',
                fromPath: fromPath,
                toPath: toPath,
                message: 'Asset moved from Assets/icon.png to Assets/Textures/icon.png'
              };
            }
            
            if (fromPath === 'Assets/NonExistent.png') {
              throw new Error('Source asset not found: Assets/NonExistent.png');
            }
          }
          
          if (action === 'copy_asset') {
            const fromPath = params.fromPath;
            const toPath = params.toPath;
            
            if (fromPath === 'Assets/Textures/icon.png' && toPath === 'Assets/UI/icon_copy.png') {
              return {
                success: true,
                action: 'copy_asset',
                fromPath: fromPath,
                toPath: toPath,
                newGuid: 'copy123',
                message: 'Asset copied from Assets/Textures/icon.png to Assets/UI/icon_copy.png'
              };
            }
          }
          
          if (action === 'refresh') {
            return {
              success: true,
              action: 'refresh',
              message: 'Asset database refreshed',
              assetsFound: 1247,
              duration: 2.34
            };
          }
          
          if (action === 'save') {
            return {
              success: true,
              action: 'save',
              message: 'Asset database saved',
              assetsModified: 15
            };
          }
        }
        
        throw new Error('Unknown command');
      }
    };

    handler = new AssetDatabaseToolHandler(mockUnityConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'manage_asset_database');
      assert.equal(handler.description, 'Manage Unity Asset Database operations (find, info, create folders, move, copy, delete, refresh)');
      assert.ok(handler.inputSchema);
      assert.equal(handler.inputSchema.type, 'object');
    });
  });

  describe('validate', () => {
    it('should validate find_assets action with filter', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'find_assets', filter: 't:Texture2D' });
      });
    });

    it('should validate find_assets with search folders', () => {
      assert.doesNotThrow(() => {
        handler.validate({ 
          action: 'find_assets', 
          filter: 't:AudioClip',
          searchInFolders: ['Assets/Audio', 'Assets/Sounds']
        });
      });
    });

    it('should validate get_asset_info action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get_asset_info', assetPath: 'Assets/Textures/icon.png' });
      });
    });

    it('should validate create_folder action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'create_folder', folderPath: 'Assets/NewFolder' });
      });
    });

    it('should validate delete_asset action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'delete_asset', assetPath: 'Assets/old_file.png' });
      });
    });

    it('should validate move_asset action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ 
          action: 'move_asset', 
          fromPath: 'Assets/old.png',
          toPath: 'Assets/new.png'
        });
      });
    });

    it('should validate copy_asset action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ 
          action: 'copy_asset', 
          fromPath: 'Assets/original.png',
          toPath: 'Assets/copy.png'
        });
      });
    });

    it('should validate refresh and save actions', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'refresh' });
      });
      
      assert.doesNotThrow(() => {
        handler.validate({ action: 'save' });
      });
    });

    it('should fail without action', () => {
      assert.throws(() => {
        handler.validate({});
      }, { message: /action is required/ });
    });

    it('should fail with invalid action', () => {
      assert.throws(() => {
        handler.validate({ action: 'invalid' });
      }, { message: /action must be one of/ });
    });

    it('should fail find_assets without filter', () => {
      assert.throws(() => {
        handler.validate({ action: 'find_assets' });
      }, { message: /filter is required for find_assets action/ });
    });

    it('should fail get_asset_info without assetPath', () => {
      assert.throws(() => {
        handler.validate({ action: 'get_asset_info' });
      }, { message: /assetPath is required for get_asset_info action/ });
    });

    it('should fail create_folder without folderPath', () => {
      assert.throws(() => {
        handler.validate({ action: 'create_folder' });
      }, { message: /folderPath is required for create_folder action/ });
    });

    it('should fail move_asset without paths', () => {
      assert.throws(() => {
        handler.validate({ action: 'move_asset', fromPath: 'Assets/test.png' });
      }, { message: /toPath is required for move_asset action/ });
    });

    it('should fail with empty filter', () => {
      assert.throws(() => {
        handler.validate({ action: 'find_assets', filter: '' });
      }, { message: /filter cannot be empty/ });
    });

    it('should fail with invalid path format', () => {
      assert.throws(() => {
        handler.validate({ action: 'get_asset_info', assetPath: 'Textures/icon.png' });
      }, { message: /assetPath must start with "Assets\/"/ });
    });
  });

  describe('execute', () => {
    it('should find assets by type successfully', async () => {
      const result = await handler.execute({ 
        action: 'find_assets', 
        filter: 't:Texture2D' 
      });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'find_assets');
      assert.equal(result.filter, 't:Texture2D');
      assert.equal(result.assets.length, 2);
      assert.equal(result.count, 2);
      assert.equal(result.assets[0].name, 'icon');
      assert.equal(result.assets[0].type, 'Texture2D');
    });

    it('should find assets with search folders', async () => {
      const result = await handler.execute({ 
        action: 'find_assets', 
        filter: 't:AudioClip wav',
        searchInFolders: ['Assets/Audio']
      });
      
      assert.equal(result.success, true);
      assert.equal(result.assets.length, 1);
      assert.equal(result.assets[0].name, 'music');
    });

    it('should get asset info successfully', async () => {
      const result = await handler.execute({ 
        action: 'get_asset_info', 
        assetPath: 'Assets/Textures/icon.png' 
      });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'get_asset_info');
      assert.equal(result.info.name, 'icon');
      assert.equal(result.info.type, 'Texture2D');
      assert.equal(result.info.guid, 'abc123');
      assert.ok(result.info.importSettings);
      assert.ok(result.info.dependencies);
    });

    it('should create folder successfully', async () => {
      const result = await handler.execute({ 
        action: 'create_folder', 
        folderPath: 'Assets/NewFolder' 
      });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'create_folder');
      assert.equal(result.folderPath, 'Assets/NewFolder');
      assert.ok(result.guid);
      assert.ok(result.message.includes('created'));
    });

    it('should delete asset successfully', async () => {
      const result = await handler.execute({ 
        action: 'delete_asset', 
        assetPath: 'Assets/Textures/old_icon.png' 
      });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'delete_asset');
      assert.ok(result.message.includes('deleted'));
    });

    it('should move asset successfully', async () => {
      const result = await handler.execute({ 
        action: 'move_asset', 
        fromPath: 'Assets/icon.png',
        toPath: 'Assets/Textures/icon.png'
      });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'move_asset');
      assert.equal(result.fromPath, 'Assets/icon.png');
      assert.equal(result.toPath, 'Assets/Textures/icon.png');
      assert.ok(result.message.includes('moved'));
    });

    it('should copy asset successfully', async () => {
      const result = await handler.execute({ 
        action: 'copy_asset', 
        fromPath: 'Assets/Textures/icon.png',
        toPath: 'Assets/UI/icon_copy.png'
      });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'copy_asset');
      assert.ok(result.newGuid);
      assert.ok(result.message.includes('copied'));
    });

    it('should refresh database successfully', async () => {
      const result = await handler.execute({ action: 'refresh' });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'refresh');
      assert.ok(result.message.includes('refreshed'));
      assert.equal(result.assetsFound, 1247);
      assert.ok(typeof result.duration === 'number');
    });

    it('should save database successfully', async () => {
      const result = await handler.execute({ action: 'save' });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'save');
      assert.ok(result.message.includes('saved'));
      assert.equal(result.assetsModified, 15);
    });

    it('should handle invalid filter', async () => {
      await assert.rejects(
        handler.execute({ action: 'find_assets', filter: 'InvalidFilter' }),
        { message: /Invalid filter syntax: InvalidFilter/ }
      );
    });

    it('should handle non-existent asset', async () => {
      await assert.rejects(
        handler.execute({ action: 'get_asset_info', assetPath: 'Assets/NonExistent.png' }),
        { message: /Asset not found: Assets\/NonExistent.png/ }
      );
    });

    it('should handle existing folder creation', async () => {
      await assert.rejects(
        handler.execute({ action: 'create_folder', folderPath: 'Assets/Textures' }),
        { message: /Folder already exists: Assets\/Textures/ }
      );
    });
  });

  describe('getExamples', () => {
    it('should return array of examples', () => {
      const examples = handler.getExamples();
      assert.ok(Array.isArray(examples));
      assert.ok(examples.length >= 6);
      
      // Check first example structure
      const firstExample = examples[0];
      assert.ok(firstExample.input);
      assert.ok(firstExample.output);
      assert.equal(firstExample.input.action, 'find_assets');
    });

    it('should include examples for all main actions', () => {
      const examples = handler.getExamples();
      const actions = examples.map(e => e.input.action);
      
      assert.ok(actions.includes('find_assets'));
      assert.ok(actions.includes('get_asset_info'));
      assert.ok(actions.includes('create_folder'));
      assert.ok(actions.includes('move_asset'));
      assert.ok(actions.includes('delete_asset'));
      assert.ok(actions.includes('refresh'));
    });
  });
});