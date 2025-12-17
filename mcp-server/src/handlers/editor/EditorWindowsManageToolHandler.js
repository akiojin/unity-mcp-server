import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handles Unity Editor window management operations
 */
export class EditorWindowsManageToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'manage_windows',
      'Manage editor windows: list/focus/get_state including hidden windows.',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['get', 'focus', 'get_state'],
            description: 'Operation: get (list), focus, or get_state.'
          },
          windowType: {
            type: 'string',
            description:
              'Window type (e.g., SceneView, GameView, InspectorWindow). Required for focus/get_state.'
          },
          includeHidden: {
            type: 'boolean',
            description: 'If true, includes hidden/minimized windows for get.'
          }
        },
        required: ['action']
      }
    );
    this.unityConnection = unityConnection;
  }

  /**
   * Validate the parameters for the window management operation
   */
  validate(params) {
    const { action, windowType } = params;

    // Check action is provided
    if (!action) {
      throw new Error('action is required');
    }

    // Validate action is one of the allowed values
    const allowedActions = ['get', 'focus', 'get_state'];
    if (!allowedActions.includes(action)) {
      throw new Error(`action must be one of: ${allowedActions.join(', ')}`);
    }

    // Validate based on action
    if (action === 'focus' || action === 'get_state') {
      if (windowType === undefined || windowType === null) {
        throw new Error(`windowType is required for ${action} action`);
      }

      if (windowType === '') {
        throw new Error('windowType cannot be empty');
      }
    }

    // Call parent validation last
    super.validate(params);
  }

  /**
   * Execute the window management command
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const result = await this.unityConnection.sendCommand('manage_windows', params);

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
      getAllWindows: {
        description: 'Get all open editor windows',
        params: {
          action: 'get'
        }
      },
      getAllWindowsIncludingHidden: {
        description: 'Get all windows including hidden ones',
        params: {
          action: 'get',
          includeHidden: true
        }
      },
      focusSceneView: {
        description: 'Focus the Scene view window',
        params: {
          action: 'focus',
          windowType: 'SceneView'
        }
      },
      focusGameView: {
        description: 'Focus the Game view window',
        params: {
          action: 'focus',
          windowType: 'GameView'
        }
      },
      getWindowState: {
        description: 'Get detailed state of a specific window',
        params: {
          action: 'get_state',
          windowType: 'InspectorWindow'
        }
      }
    };
  }
}
