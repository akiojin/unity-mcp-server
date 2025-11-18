import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for the gameobject_find tool
 * Finds GameObjects in Unity scene by various criteria
 */
export class GameObjectFindToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'gameobject_find',
      'Find GameObjects by name, tag, or layer with optional exact matching.',
      {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name to search for'
          },
          tag: {
            type: 'string',
            description: 'Tag to search for'
          },
          layer: {
            type: 'number',
            description: 'Layer index to search for (0-31)',
            minimum: 0,
            maximum: 31
          },
          exactMatch: {
            type: 'boolean',
            description: 'Whether to match name exactly (default: false)'
          }
        },
        required: []
      }
    );

    this.unityConnection = unityConnection;
  }

  /**
   * Validates the input parameters
   * @param {object} params - Input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    super.validate(params);

    // At least one search criteria must be provided
    if (!params.name && !params.tag && params.layer === undefined) {
      throw new Error('At least one search criteria (name, tag, or layer) must be provided');
    }

    // Validate layer
    if (params.layer !== undefined) {
      const layer = Number(params.layer);
      if (isNaN(layer) || layer < 0 || layer > 31) {
        throw new Error('layer must be a number between 0 and 31');
      }
    }
  }

  /**
   * Executes the find_gameobject command
   * @param {object} params - Input parameters
   * @returns {Promise<object>} Found GameObjects
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send find_gameobject command
    const result = await this.unityConnection.sendCommand('find_gameobject', params);

    // Check for errors from Unity
    if (result.error) {
      throw new Error(result.error);
    }

    // Add summary information
    if (result.objects && Array.isArray(result.objects)) {
      result.summary = this.generateSummary(result.objects, params);
    }

    return result;
  }

  /**
   * Generates a summary of the search results
   * @param {Array} objects - Found GameObjects
   * @param {object} searchParams - Search parameters used
   * @returns {string} Summary text
   */
  generateSummary(objects, searchParams) {
    const parts = [];

    if (searchParams.name) {
      parts.push(
        `name${searchParams.exactMatch === false ? ' containing' : ''} "${searchParams.name}"`
      );
    }
    if (searchParams.tag) {
      parts.push(`tag "${searchParams.tag}"`);
    }
    if (searchParams.layer !== undefined) {
      parts.push(`layer ${searchParams.layer}`);
    }

    const criteria = parts.join(', ');

    if (objects.length === 0) {
      return `No GameObjects found matching ${criteria}`;
    } else if (objects.length === 1) {
      return `Found 1 GameObject matching ${criteria}: ${objects[0].name}`;
    } else {
      return `Found ${objects.length} GameObjects matching ${criteria}`;
    }
  }
}
