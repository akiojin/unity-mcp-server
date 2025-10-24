import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for Unity Editor tool and plugin management operations
 */
export class ToolManagementToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'editor_tools_manage',
      'Manage editor tools/plugins: list, activate/deactivate, refresh cache.',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['get', 'activate', 'deactivate', 'refresh'],
            description: 'Operation: get, activate, deactivate, or refresh.'
          },
          toolName: {
            type: 'string',
            description: 'Tool name (required for activate/deactivate).'
          },
          category: {
            type: 'string',
            description: 'Optional: filter list by category.'
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

    const validActions = ['get', 'activate', 'deactivate', 'refresh'];
    if (!validActions.includes(params.action)) {
      throw new Error(`action must be one of: ${validActions.join(', ')}`);
    }

    // Validate toolName for activate/deactivate actions
    if (params.action === 'activate' || params.action === 'deactivate') {
      if (params.toolName === undefined || params.toolName === null) {
        throw new Error(`toolName is required for ${params.action} action`);
      }
      
      if (params.toolName === '') {
        throw new Error('toolName cannot be empty');
      }
    }

    // Validate category if provided
    if (params.category !== undefined && params.category !== null && params.category === '') {
      throw new Error('category cannot be empty');
    }
  }

  async execute(params) {
    this.validate(params);
    
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const result = await this.unityConnection.sendCommand('manage_tools', params);
    return result;
  }

  getExamples() {
    return [
      {
        input: { action: 'get' },
        output: {
          success: true,
          action: 'get',
          tools: [
            {
              name: 'ProBuilder',
              displayName: 'ProBuilder',
              version: '5.1.0',
              category: 'Modeling',
              isInstalled: true,
              isActive: true
            },
            {
              name: 'Cinemachine',
              displayName: 'Cinemachine',
              version: '2.9.0',
              category: 'Camera',
              isInstalled: true,
              isActive: false
            }
          ],
          installedCount: 2,
          activeCount: 1
        }
      },
      {
        input: { action: 'activate', toolName: 'Cinemachine' },
        output: {
          success: true,
          action: 'activate',
          toolName: 'Cinemachine',
          previousState: { isActive: false },
          currentState: { isActive: true },
          message: 'Tool activated: Cinemachine'
        }
      },
      {
        input: { action: 'deactivate', toolName: 'ProBuilder' },
        output: {
          success: true,
          action: 'deactivate',
          toolName: 'ProBuilder',
          previousState: { isActive: true },
          currentState: { isActive: false },
          message: 'Tool deactivated: ProBuilder'
        }
      },
      {
        input: { action: 'refresh' },
        output: {
          success: true,
          action: 'refresh',
          message: 'Tool cache refreshed',
          toolsCount: 15,
          timestamp: '2024-01-01T12:00:00.000Z'
        }
      }
    ];
  }
}
