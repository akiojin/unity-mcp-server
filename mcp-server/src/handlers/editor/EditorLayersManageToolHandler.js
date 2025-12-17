import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handles Unity layer management operations
 */
export class EditorLayersManageToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('manage_layers', 'Manage project layers: add/remove/list and convert (by name/index).', {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['add', 'remove', 'get', 'get_by_name', 'get_by_index'],
          description: 'Operation: add, remove, get, get_by_name, or get_by_index.'
        },
        layerName: {
          type: 'string',
          description:
            'Layer name (required for add/remove/get_by_name). Letters/numbers/space/_ only.'
        },
        layerIndex: {
          type: 'number',
          minimum: 0,
          maximum: 31,
          description: 'Layer index (0-31). Required for get_by_index.'
        }
      },
      required: ['action']
    });
    this.unityConnection = unityConnection;
    this.RESERVED_LAYERS = ['Default', 'TransparentFX', 'Ignore Raycast', 'Water', 'UI'];
  }

  /**
   * Validate the parameters for the layer management operation
   */
  validate(params) {
    const { action, layerName, layerIndex } = params;

    // Check action is provided
    if (!action) {
      throw new Error('action is required');
    }

    // Validate action is one of the allowed values
    const allowedActions = ['add', 'remove', 'get', 'get_by_name', 'get_by_index'];
    if (!allowedActions.includes(action)) {
      throw new Error(`action must be one of: ${allowedActions.join(', ')}`);
    }

    // Validate based on action
    switch (action) {
      case 'add':
      case 'remove':
        if (layerName === undefined || layerName === null) {
          throw new Error(`layerName is required for ${action} action`);
        }
        if (layerName === '') {
          throw new Error('layerName cannot be empty');
        }
        if (!this.isValidLayerName(layerName)) {
          throw new Error('layerName contains invalid characters');
        }
        if (action === 'add' && this.RESERVED_LAYERS.includes(layerName)) {
          throw new Error('layerName is reserved');
        }
        break;

      case 'get_by_name':
        if (layerName === undefined || layerName === null) {
          throw new Error('layerName is required for get_by_name action');
        }
        break;

      case 'get_by_index':
        if (layerIndex === undefined || layerIndex === null) {
          throw new Error('layerIndex is required for get_by_index action');
        }
        if (layerIndex < 0 || layerIndex > 31) {
          throw new Error('layerIndex must be between 0 and 31');
        }
        break;
    }

    // Call parent validation last
    super.validate(params);
  }

  /**
   * Check if layer name contains only valid characters
   */
  isValidLayerName(layerName) {
    // Layer names should only contain letters, numbers, spaces, and underscores
    const validPattern = /^[a-zA-Z0-9\s_]+$/;
    return validPattern.test(layerName);
  }

  /**
   * Execute the layer management command
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const result = await this.unityConnection.sendCommand('manage_layers', params);

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  /**
   * Get examples of how to use this tool
   */
  getExamples() {
    return {
      getLayers: {
        description: 'Get all layers with indices',
        params: {
          action: 'get'
        }
      },
      addLayer: {
        description: 'Add a new layer',
        params: {
          action: 'add',
          layerName: 'Enemy'
        }
      },
      removeLayer: {
        description: 'Remove an existing layer',
        params: {
          action: 'remove',
          layerName: 'Enemy'
        }
      },
      getLayerByName: {
        description: 'Get layer index by name',
        params: {
          action: 'get_by_name',
          layerName: 'Player'
        }
      },
      getLayerByIndex: {
        description: 'Get layer name by index',
        params: {
          action: 'get_by_index',
          layerIndex: 8
        }
      }
    };
  }
}
