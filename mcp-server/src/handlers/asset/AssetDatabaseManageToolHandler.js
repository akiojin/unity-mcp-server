import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for Unity Asset Database operations
 */
export class AssetDatabaseManageToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'asset_database_manage',
      'Manage Unity Asset Database operations (find, info, create folders, move, copy, delete, refresh). NOTE: The "refresh" action may take 5-120+ seconds for large projects as Unity needs to scan all assets, reimport changed files, and compile scripts. Please wait for the operation to complete.',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['find_assets', 'get_asset_info', 'create_folder', 'delete_asset', 'move_asset', 'copy_asset', 'refresh', 'save'],
            description: 'The action to perform'
          },
          filter: {
            type: 'string',
            description: 'Search filter for find_assets (e.g., "t:Texture2D", "l:UI")'
          },
          searchInFolders: {
            type: 'array',
            items: { type: 'string' },
            description: 'Folders to search in for find_assets (optional)'
          },
          assetPath: {
            type: 'string',
            description: 'Path to the asset (must start with "Assets/")'
          },
          folderPath: {
            type: 'string',
            description: 'Path for folder creation (must start with "Assets/")'
          },
          fromPath: {
            type: 'string',
            description: 'Source path for move/copy operations'
          },
          toPath: {
            type: 'string',
            description: 'Destination path for move/copy operations'
          }
        },
        required: ['action']
      }
    );
    this.unityConnection = unityConnection;
  }

  validate(params) {
    if (!params.action) {
      throw new Error('action is required');
    }

    const validActions = ['find_assets', 'get_asset_info', 'create_folder', 'delete_asset', 'move_asset', 'copy_asset', 'refresh', 'save'];
    if (!validActions.includes(params.action)) {
      throw new Error(`action must be one of: ${validActions.join(', ')}`);
    }

    // Validate action-specific requirements
    switch (params.action) {
      case 'find_assets':
        if (params.filter === undefined || params.filter === null) {
          throw new Error('filter is required for find_assets action');
        }
        if (params.filter === '') {
          throw new Error('filter cannot be empty');
        }
        break;

      case 'get_asset_info':
      case 'delete_asset':
        if (params.assetPath === undefined || params.assetPath === null) {
          throw new Error(`assetPath is required for ${params.action} action`);
        }
        if (params.assetPath === '') {
          throw new Error('assetPath cannot be empty');
        }
        this.validateAssetPath(params.assetPath);
        break;

      case 'create_folder':
        if (params.folderPath === undefined || params.folderPath === null) {
          throw new Error('folderPath is required for create_folder action');
        }
        if (params.folderPath === '') {
          throw new Error('folderPath cannot be empty');
        }
        this.validateAssetPath(params.folderPath);
        break;

      case 'move_asset':
      case 'copy_asset':
        if (params.fromPath === undefined || params.fromPath === null) {
          throw new Error(`fromPath is required for ${params.action} action`);
        }
        if (params.toPath === undefined || params.toPath === null) {
          throw new Error(`toPath is required for ${params.action} action`);
        }
        if (params.fromPath === '') {
          throw new Error('fromPath cannot be empty');
        }
        if (params.toPath === '') {
          throw new Error('toPath cannot be empty');
        }
        this.validateAssetPath(params.fromPath);
        this.validateAssetPath(params.toPath);
        break;

      case 'refresh':
      case 'save':
        // No additional validation needed
        break;
    }
  }

  validateAssetPath(path) {
    if (!path.startsWith('Assets/')) {
      throw new Error('assetPath must start with "Assets/"');
    }
  }

  async execute(params) {
    this.validate(params);
    
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const result = await this.unityConnection.sendCommand('manage_asset_database', params);
    return result;
  }

  getExamples() {
    return [
      {
        input: { action: 'find_assets', filter: 't:Texture2D' },
        output: {
          success: true,
          action: 'find_assets',
          filter: 't:Texture2D',
          assets: [
            {
              path: 'Assets/Textures/icon.png',
              name: 'icon',
              type: 'Texture2D',
              guid: 'abc123',
              size: 1024
            }
          ],
          count: 1
        }
      },
      {
        input: { action: 'get_asset_info', assetPath: 'Assets/Textures/icon.png' },
        output: {
          success: true,
          action: 'get_asset_info',
          assetPath: 'Assets/Textures/icon.png',
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
        }
      },
      {
        input: { action: 'create_folder', folderPath: 'Assets/NewFolder' },
        output: {
          success: true,
          action: 'create_folder',
          folderPath: 'Assets/NewFolder',
          guid: 'folder123',
          message: 'Folder created: Assets/NewFolder'
        }
      },
      {
        input: { 
          action: 'move_asset', 
          fromPath: 'Assets/icon.png',
          toPath: 'Assets/Textures/icon.png'
        },
        output: {
          success: true,
          action: 'move_asset',
          fromPath: 'Assets/icon.png',
          toPath: 'Assets/Textures/icon.png',
          message: 'Asset moved from Assets/icon.png to Assets/Textures/icon.png'
        }
      },
      {
        input: { action: 'delete_asset', assetPath: 'Assets/old_file.png' },
        output: {
          success: true,
          action: 'delete_asset',
          assetPath: 'Assets/old_file.png',
          message: 'Asset deleted: Assets/old_file.png'
        }
      },
      {
        input: { action: 'refresh' },
        output: {
          success: true,
          action: 'refresh',
          message: 'Asset database refreshed',
          assetsFound: 1247,
          duration: 2.34
        }
      }
    ];
  }
}