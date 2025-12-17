import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handles Unity Editor selection operations
 */
export class EditorSelectionManageToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'manage_selection',
      'Manage editor selection: get/set/clear and optionally include details.',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['get', 'set', 'clear', 'get_details'],
            description: 'Operation: get, set, clear, or get_details.'
          },
          objectPaths: {
            type: 'array',
            items: {
              type: 'string'
            },
            description:
              'GameObject paths for set (e.g., ["/Main Camera", "/Player"]). Must start with /.'
          },
          includeDetails: {
            type: 'boolean',
            description: 'If true, return detailed info with get/get_details.'
          }
        },
        required: ['action']
      }
    );
    this.unityConnection = unityConnection;
  }

  /**
   * Validate the parameters for the selection operation
   */
  validate(params) {
    const { action, objectPaths } = params;

    // Check action is provided
    if (!action) {
      throw new Error('action is required');
    }

    // Validate action is one of the allowed values
    const allowedActions = ['get', 'set', 'clear', 'get_details'];
    if (!allowedActions.includes(action)) {
      throw new Error(`action must be one of: ${allowedActions.join(', ')}`);
    }

    // Validate based on action
    if (action === 'set') {
      if (!objectPaths) {
        throw new Error('objectPaths is required for set action');
      }

      if (!Array.isArray(objectPaths)) {
        throw new Error('objectPaths must be an array');
      }

      if (objectPaths.length === 0) {
        throw new Error('objectPaths cannot be empty');
      }

      // Validate each path
      for (const path of objectPaths) {
        if (typeof path !== 'string') {
          throw new Error('All object paths must be strings');
        }

        if (!path.startsWith('/')) {
          throw new Error('All object paths must start with /');
        }
      }
    }

    // Call parent validation last
    super.validate(params);
  }

  /**
   * Execute the selection command
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const result = await this.unityConnection.sendCommand('manage_selection', params);

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
      getSelection: {
        description: 'Get current selection',
        params: {
          action: 'get'
        }
      },
      getSelectionWithDetails: {
        description: 'Get current selection with detailed info',
        params: {
          action: 'get',
          includeDetails: true
        }
      },
      setSelection: {
        description: 'Set selection to specific objects',
        params: {
          action: 'set',
          objectPaths: ['/Main Camera', '/Directional Light']
        }
      },
      clearSelection: {
        description: 'Clear current selection',
        params: {
          action: 'clear'
        }
      },
      getSelectionDetails: {
        description: 'Get detailed information about selection',
        params: {
          action: 'get_details'
        }
      }
    };
  }
}
