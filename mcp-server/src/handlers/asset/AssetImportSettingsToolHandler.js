import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for Unity asset import settings management
 */
export class AssetImportSettingsToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'manage_asset_import_settings',
      'Manage Unity asset import settings (get, modify, apply presets, reimport)',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['get', 'modify', 'apply_preset', 'reimport'],
            description: 'The action to perform'
          },
          assetPath: {
            type: 'string',
            description: 'Path to the asset (must start with "Assets/")'
          },
          settings: {
            type: 'object',
            description: 'Import settings to apply (required for modify action)'
          },
          preset: {
            type: 'string',
            description: 'Name of the preset to apply (required for apply_preset action)'
          }
        },
        required: ['action', 'assetPath']
      }
    );
    this.unityConnection = unityConnection;
  }

  validate(params) {
    if (!params.action) {
      throw new Error('action is required');
    }

    const validActions = ['get', 'modify', 'apply_preset', 'reimport'];
    if (!validActions.includes(params.action)) {
      throw new Error(`action must be one of: ${validActions.join(', ')}`);
    }

    // Validate assetPath
    if (params.assetPath === undefined || params.assetPath === null) {
      throw new Error('assetPath is required');
    }

    if (params.assetPath === '') {
      throw new Error('assetPath cannot be empty');
    }

    // Validate assetPath starts with "Assets/"
    if (!params.assetPath.startsWith('Assets/')) {
      throw new Error('assetPath must start with "Assets/"');
    }

    // Validate settings for modify action
    if (params.action === 'modify') {
      if (!params.settings) {
        throw new Error('settings is required for modify action');
      }
    }

    // Validate preset for apply_preset action
    if (params.action === 'apply_preset') {
      if (params.preset === undefined || params.preset === null) {
        throw new Error('preset is required for apply_preset action');
      }
      
      if (params.preset === '') {
        throw new Error('preset cannot be empty');
      }
    }
  }

  async execute(params) {
    this.validate(params);
    
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const result = await this.unityConnection.sendCommand('manage_asset_import_settings', params);
    return result;
  }

  getExamples() {
    return [
      {
        input: { action: 'get', assetPath: 'Assets/Textures/icon.png' },
        output: {
          success: true,
          action: 'get',
          assetPath: 'Assets/Textures/icon.png',
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
        }
      },
      {
        input: { 
          action: 'modify', 
          assetPath: 'Assets/Textures/icon.png',
          settings: {
            maxTextureSize: 1024,
            compressionQuality: 75
          }
        },
        output: {
          success: true,
          action: 'modify',
          assetPath: 'Assets/Textures/icon.png',
          previousSettings: {
            maxTextureSize: 2048,
            compressionQuality: 50
          },
          newSettings: {
            maxTextureSize: 1024,
            compressionQuality: 75
          },
          message: 'Import settings modified for: Assets/Textures/icon.png'
        }
      },
      {
        input: { 
          action: 'apply_preset', 
          assetPath: 'Assets/Textures/icon.png',
          preset: 'UI_Sprite'
        },
        output: {
          success: true,
          action: 'apply_preset',
          assetPath: 'Assets/Textures/icon.png',
          preset: 'UI_Sprite',
          appliedSettings: {
            textureType: 'Sprite',
            filterMode: 'Bilinear',
            maxTextureSize: 2048,
            generateMipMaps: false
          },
          message: 'Preset "UI_Sprite" applied to: Assets/Textures/icon.png'
        }
      },
      {
        input: { action: 'reimport', assetPath: 'Assets/Textures/icon.png' },
        output: {
          success: true,
          action: 'reimport',
          assetPath: 'Assets/Textures/icon.png',
          message: 'Asset reimported: Assets/Textures/icon.png',
          duration: 0.245
        }
      }
    ];
  }
}