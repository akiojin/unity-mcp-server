import { BaseToolHandler } from '../base/BaseToolHandler.js';

const actionProperties = {
  action: {
    type: 'string',
    enum: ['move', 'click', 'drag', 'scroll', 'button'],
    description: 'The mouse action to perform'
  },
  x: {
    type: 'number',
    description: 'X coordinate for move action'
  },
  y: {
    type: 'number',
    description: 'Y coordinate for move action'
  },
  absolute: {
    type: 'boolean',
    description: 'Whether coordinates are absolute or relative (default: true)'
  },
  button: {
    type: 'string',
    enum: ['left', 'right', 'middle'],
    description: 'Mouse button for click/drag/button actions'
  },
  buttonAction: {
    type: 'string',
    enum: ['press', 'release'],
    description: 'Button action for button presses'
  },
  clickCount: {
    type: 'number',
    description: 'Number of clicks (for double/triple click)'
  },
  startX: {
    type: 'number',
    description: 'Start X for drag action'
  },
  startY: {
    type: 'number',
    description: 'Start Y for drag action'
  },
  endX: {
    type: 'number',
    description: 'End X for drag action'
  },
  endY: {
    type: 'number',
    description: 'End Y for drag action'
  },
  deltaX: {
    type: 'number',
    description: 'Horizontal scroll delta'
  },
  deltaY: {
    type: 'number',
    description: 'Vertical scroll delta'
  },
  holdSeconds: {
    type: 'number',
    minimum: 0,
    description: 'Automatically release button after this many seconds'
  }
};

function validateMouseAction(params, context = 'action') {
  if (!params || typeof params !== 'object') {
    throw new Error(`${context} must be an object`);
  }

  const {
    action,
    x,
    y,
    startX,
    startY,
    endX,
    endY,
    button,
    buttonAction,
    holdSeconds,
    deltaX,
    deltaY
  } = params;

  if (!action) {
    throw new Error(`${context}: action is required`);
  }

  switch (action) {
    case 'move':
      if (x === undefined || y === undefined) {
        throw new Error(`${context}: x and y coordinates are required for move action`);
      }
      break;
    case 'drag':
      if (
        startX === undefined ||
        startY === undefined ||
        endX === undefined ||
        endY === undefined
      ) {
        throw new Error(`${context}: startX, startY, endX, and endY are required for drag action`);
      }
      break;
    case 'click':
      // button optional (defaults to left)
      break;
    case 'scroll':
      if (deltaX === undefined && deltaY === undefined) {
        throw new Error(`${context}: deltaX or deltaY is required for scroll action`);
      }
      break;
    case 'button':
      if (!button) {
        throw new Error(`${context}: button is required for button action`);
      }
      if (!buttonAction) {
        throw new Error(`${context}: buttonAction is required for button action`);
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
 * Handler for the input_mouse tool
 */
export class InputMouseToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'input_mouse',
      'Mouse input (move/click/drag/scroll/button) with batching and auto-hold.',
      {
        type: 'object',
        properties: {
          ...actionProperties,
          actions: {
            type: 'array',
            description: 'Batch multiple mouse actions executed in order',
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
      actions.forEach((action, index) => validateMouseAction(action, `actions[${index}]`));
      return;
    }

    if (actions !== undefined && !Array.isArray(actions)) {
      throw new Error('actions must be an array');
    }

    validateMouseAction(params);
  }

  async execute(params) {
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const hasBatch = Array.isArray(params.actions) && params.actions.length > 0;
    const payload = hasBatch ? { actions: params.actions } : params;

    const result = await this.unityConnection.sendCommand('input_mouse', payload);
    return result;
  }
}
