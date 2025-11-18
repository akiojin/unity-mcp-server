import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for Unity tag management operations
 */
export class EditorTagsManageToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'editor_tags_manage',
      'Manage project tags: add/remove/list with validation for reserved names.',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'remove', 'get'],
            description: 'Operation: add, remove, or get.'
          },
          tagName: {
            type: 'string',
            description: 'Tag name (required for add/remove). Alphanumeric/underscore only.'
          }
        },
        required: ['action']
      }
    );

    this.unityConnection = unityConnection;

    // Reserved Unity tags that cannot be removed
    this.RESERVED_TAGS = [
      'Untagged',
      'Respawn',
      'Finish',
      'EditorOnly',
      'MainCamera',
      'Player',
      'GameController'
    ];
  }

  /**
   * Validates the input parameters
   * @param {Object} params - The input parameters
   */
  validate(params) {
    const { action, tagName } = params;

    // Check if action is provided
    if (!action) {
      throw new Error('action is required');
    }

    // Check if action is valid
    if (!['add', 'remove', 'get'].includes(action)) {
      throw new Error('action must be one of: add, remove, get');
    }

    // For add and remove actions, tagName is required
    if (action === 'add' || action === 'remove') {
      if (tagName === undefined || tagName === null) {
        throw new Error(`tagName is required for ${action} action`);
      }
      if (typeof tagName === 'string' && tagName.trim() === '') {
        throw new Error('tagName cannot be empty');
      }
    }

    // Validate tag name if provided
    if (tagName !== undefined && tagName !== '') {
      // Check for invalid characters (Unity tag names should be alphanumeric with no spaces or special characters)
      if (!/^[a-zA-Z0-9_]+$/.test(tagName)) {
        throw new Error(
          'tagName contains invalid characters. Only letters, numbers, and underscores are allowed'
        );
      }

      // Check for reserved tag names when adding
      if (action === 'add' && this.RESERVED_TAGS.includes(tagName)) {
        throw new Error(`tagName is reserved`);
      }
    }

    // Call parent validation last to avoid conflicts
    super.validate(params);
  }

  /**
   * Executes the tag management operation
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} The result of the tag operation
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('manage_tags', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    return response;
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      getTags: {
        description: 'Get all available tags in the project',
        params: {
          action: 'get'
        }
      },
      addTag: {
        description: 'Add a new tag to the project',
        params: {
          action: 'add',
          tagName: 'Enemy'
        }
      },
      removeTag: {
        description: 'Remove an existing tag from the project',
        params: {
          action: 'remove',
          tagName: 'OldTag'
        }
      }
    };
  }
}
