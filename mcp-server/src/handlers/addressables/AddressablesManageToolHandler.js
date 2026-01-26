import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Addressables Management Tool Handler for Unity MCP
 * Handles Unity Addressables asset and group management operations
 */
export default class AddressablesManageToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'addressables_manage',
      'Manage Unity Addressables assets and groups - add, remove, organize entries and groups',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: [
              'add_entry',
              'remove_entry',
              'set_address',
              'add_label',
              'remove_label',
              'list_entries',
              'list_groups',
              'create_group',
              'remove_group',
              'move_entry'
            ],
            description: 'The Addressables management operation to perform'
          },
          assetPath: {
            type: 'string',
            pattern: '^Assets/.+',
            description: 'Asset path starting with Assets/ (required for most actions)'
          },
          address: {
            type: 'string',
            description: 'Addressable name/address (required for add_entry)'
          },
          groupName: {
            type: 'string',
            description: 'Group name (required for add_entry, create_group, remove_group)'
          },
          targetGroupName: {
            type: 'string',
            description: 'Target group name for move_entry'
          },
          label: {
            type: 'string',
            description: 'Label name for add_label/remove_label'
          },
          labels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Labels to add (optional for add_entry)'
          },
          newAddress: {
            type: 'string',
            description: 'New address name for set_address'
          },
          pageSize: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: 'Number of results per page (for list_entries)'
          },
          offset: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Offset for pagination (for list_entries)'
          }
        },
        required: ['action']
      }
    );
    this.unityConnection = unityConnection;
  }

  validate(params) {
    const { action, assetPath, address, groupName, label, newAddress, targetGroupName } =
      params || {};

    if (!action) {
      throw new Error('action is required');
    }

    const validActions = [
      'add_entry',
      'remove_entry',
      'set_address',
      'add_label',
      'remove_label',
      'list_entries',
      'list_groups',
      'create_group',
      'remove_group',
      'move_entry'
    ];

    if (!validActions.includes(action)) {
      throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);
    }

    // Action-specific validation
    switch (action) {
      case 'add_entry':
        if (!assetPath) throw new Error('assetPath is required for add_entry');
        if (!address) throw new Error('address is required for add_entry');
        if (!groupName) throw new Error('groupName is required for add_entry');
        break;
      case 'remove_entry':
      case 'add_label':
      case 'remove_label':
        if (!assetPath) throw new Error(`assetPath is required for ${action}`);
        if ((action === 'add_label' || action === 'remove_label') && !label) {
          throw new Error(`label is required for ${action}`);
        }
        break;
      case 'set_address':
        if (!assetPath) throw new Error('assetPath is required for set_address');
        if (!newAddress) throw new Error('newAddress is required for set_address');
        break;
      case 'create_group':
      case 'remove_group':
        if (!groupName) throw new Error(`groupName is required for ${action}`);
        break;
      case 'move_entry':
        if (!assetPath) throw new Error('assetPath is required for move_entry');
        if (!targetGroupName) throw new Error('targetGroupName is required for move_entry');
        break;
    }
  }

  async execute(params) {
    const { action, ...parameters } = params;

    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const result = await this.unityConnection.sendCommand('manage_addressables', {
      action,
      ...parameters
    });

    return this.formatResponse(action, result);
  }

  formatResponse(action, result) {
    if (result && result.error) {
      throw new Error(result.error.message || result.error);
    }

    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from Unity');
    }

    // Return formatted response
    return {
      content: [
        {
          type: 'text',
          text: this.formatResultText(action, result)
        }
      ]
    };
  }

  formatResultText(action, result) {
    const lines = [];

    switch (action) {
      case 'add_entry':
        lines.push('✅ Addressableエントリを追加しました');
        if (result.data) {
          lines.push(`  📁 Asset: ${result.data.assetPath}`);
          lines.push(`  🏷️  Address: ${result.data.address}`);
          lines.push(`  📦 Group: ${result.data.groupName}`);
          if (result.data.labels && result.data.labels.length > 0) {
            lines.push(`  🏷️  Labels: ${result.data.labels.join(', ')}`);
          }
        }
        break;

      case 'remove_entry':
        lines.push(`✅ ${result.message}`);
        break;

      case 'set_address':
        lines.push('✅ アドレスを変更しました');
        if (result.data) {
          lines.push(`  📁 Asset: ${result.data.assetPath}`);
          lines.push(`  🏷️  New Address: ${result.data.address}`);
        }
        break;

      case 'add_label':
      case 'remove_label':
        lines.push(`✅ ラベルを${action === 'add_label' ? '追加' : '削除'}しました`);
        if (result.data) {
          lines.push(`  📁 Asset: ${result.data.assetPath}`);
          lines.push(`  🏷️  Labels: ${result.data.labels.join(', ')}`);
        }
        break;

      case 'list_entries':
        lines.push('📋 Addressableエントリ一覧');
        if (result.data && result.data.entries) {
          lines.push(`  合計: ${result.pagination.total}件`);
          if (result.data.entries.length === 0) {
            lines.push('  (エントリがありません)');
          } else {
            result.data.entries.forEach(entry => {
              lines.push(`\n  📁 ${entry.assetPath}`);
              lines.push(`     Address: ${entry.address}`);
              lines.push(`     Group: ${entry.groupName}`);
              if (entry.labels && entry.labels.length > 0) {
                lines.push(`     Labels: ${entry.labels.join(', ')}`);
              }
            });
          }
          if (result.pagination.hasMore) {
            lines.push(
              `\n  ... さらに${result.pagination.total - result.pagination.offset - result.pagination.pageSize}件あります`
            );
          }
        }
        break;

      case 'list_groups':
        lines.push('📦 Addressablesグループ一覧');
        if (result.data && result.data.groups) {
          if (result.data.groups.length === 0) {
            lines.push('  (グループがありません)');
          } else {
            result.data.groups.forEach(group => {
              lines.push(`\n  📦 ${group.groupName}`);
              lines.push(`     Entries: ${group.entriesCount}個`);
              if (group.buildPath) lines.push(`     Build Path: ${group.buildPath}`);
              if (group.loadPath) lines.push(`     Load Path: ${group.loadPath}`);
            });
          }
        }
        break;

      case 'create_group':
        lines.push(`✅ グループを作成しました: ${result.data?.groupName}`);
        break;

      case 'remove_group':
        lines.push(`✅ ${result.message}`);
        break;

      case 'move_entry':
        lines.push('✅ エントリを移動しました');
        if (result.data) {
          lines.push(`  📁 Asset: ${result.data.assetPath}`);
          lines.push(`  📦 New Group: ${result.data.groupName}`);
        }
        break;

      default:
        lines.push(JSON.stringify(result, null, 2));
    }

    return lines.join('\n');
  }
}
