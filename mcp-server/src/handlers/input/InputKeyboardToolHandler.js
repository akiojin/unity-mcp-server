import { BaseToolHandler } from '../base/BaseToolHandler.js';

const actionProperties = {
  action: {
    type: 'string',
    enum: ['press', 'release', 'type', 'combo'],
    description: 'The keyboard action to perform'
  },
  key: {
    type: 'string',
    description: 'The key to press/release (for press/release actions)'
  },
  keys: {
    type: 'array',
    items: { type: 'string' },
    description: 'Array of keys for combo action'
  },
  text: {
    type: 'string',
    description: 'Text to type (for type action)'
  },
  typingSpeed: {
    type: 'number',
    description: 'Milliseconds per character when typing'
  },
  holdSeconds: {
    type: 'number',
    minimum: 0,
    description: 'Automatically release after this many seconds (press/combo)'
  }
};

function validateKeyboardAction(params, context = 'action') {
  if (!params || typeof params !== 'object') {
    throw new Error(`${context} must be an object`);
  }

  const { action, key, keys, text, holdSeconds } = params;

  if (!action) {
    throw new Error(`${context}: action is required`);
  }

  switch (action) {
    case 'press':
    case 'release':
      if (!key) {
        throw new Error(`${context}: key is required for ${action} action`);
      }
      break;
    case 'type':
      if (!text) {
        throw new Error(`${context}: text is required for type action`);
      }
      break;
    case 'combo':
      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        throw new Error(`${context}: keys array is required for combo action`);
      }
      break;
    default:
      throw new Error(`${context}: invalid action ${action}`);
  }

  if (holdSeconds !== undefined && holdSeconds < 0) {
    throw new Error(`${context}: holdSeconds must be zero or positive`);
  }
}

/**
 * Handler for the input_keyboard tool
 */
export class InputKeyboardToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'input_keyboard',
      'Keyboard input (press/release/type/combo) with batching and auto-hold.',
      {
        type: 'object',
        properties: {
          ...actionProperties,
          actions: {
            type: 'array',
            description: 'Batch multiple keyboard actions executed in order',
            items: {
              type: 'object',
              properties: { ...actionProperties },
              required: ['action']
            }
          }
        }
      }
    );
    this.unityConnection = unityConnection;
  }

  validate(params) {
    const { action, actions } = params;

    // Either 'action' or 'actions' must be provided
    if (!action && !actions) {
      throw new Error('Either "action" or "actions" parameter is required');
    }

    // But not both
    if (action && actions) {
      throw new Error('Cannot specify both "action" and "actions" parameters');
    }

    if (Array.isArray(actions)) {
      if (actions.length === 0) {
        throw new Error('actions must contain at least one entry');
      }
      actions.forEach((action, index) => validateKeyboardAction(action, `actions[${index}]`));
      return;
    }

    if (actions !== undefined && !Array.isArray(actions)) {
      throw new Error('actions must be an array');
    }

    validateKeyboardAction(params);
  }

  async execute(params) {
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const hasBatch = Array.isArray(params.actions) && params.actions.length > 0;
    const payload = hasBatch ? { actions: params.actions } : params;

    const result = await this.unityConnection.sendCommand('input_keyboard', payload);
    return result;
  }
}
