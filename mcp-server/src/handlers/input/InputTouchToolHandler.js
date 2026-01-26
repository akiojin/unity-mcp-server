import { BaseToolHandler } from '../base/BaseToolHandler.js';

const actionProperties = {
  action: {
    type: 'string',
    enum: ['tap', 'swipe', 'pinch', 'multi'],
    description: 'The touch action to perform'
  },
  x: {
    type: 'number',
    description: 'X coordinate for tap action'
  },
  y: {
    type: 'number',
    description: 'Y coordinate for tap action'
  },
  touchId: {
    type: 'number',
    minimum: 0,
    maximum: 9,
    description: 'Touch ID (0-9)'
  },
  startX: {
    type: 'number',
    description: 'Start X for swipe action'
  },
  startY: {
    type: 'number',
    description: 'Start Y for swipe action'
  },
  endX: {
    type: 'number',
    description: 'End X for swipe action'
  },
  endY: {
    type: 'number',
    description: 'End Y for swipe action'
  },
  duration: {
    type: 'number',
    description: 'Swipe duration in milliseconds'
  },
  centerX: {
    type: 'number',
    description: 'Center X for pinch gesture'
  },
  centerY: {
    type: 'number',
    description: 'Center Y for pinch gesture'
  },
  startDistance: {
    type: 'number',
    description: 'Start distance between fingers for pinch'
  },
  endDistance: {
    type: 'number',
    description: 'End distance between fingers for pinch'
  },
  touches: {
    type: 'array',
    description: 'Array of touch points for multi-touch',
    items: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        phase: {
          type: 'string',
          enum: ['began', 'moved', 'stationary', 'ended']
        }
      },
      required: ['x', 'y']
    }
  }
};

function validateTouchAction(params, context = 'action') {
  if (!params || typeof params !== 'object') {
    throw new Error(`${context} must be an object`);
  }

  const { action, x, y, startX, startY, endX, endY, touches } = params;

  if (!action) {
    throw new Error(`${context}: action is required`);
  }

  switch (action) {
    case 'tap':
      if (x === undefined || y === undefined) {
        throw new Error(`${context}: x and y coordinates are required for tap action`);
      }
      break;
    case 'swipe':
      if (
        startX === undefined ||
        startY === undefined ||
        endX === undefined ||
        endY === undefined
      ) {
        throw new Error(`${context}: startX, startY, endX, and endY are required for swipe action`);
      }
      break;
    case 'pinch':
      // Optional parameters with defaults handled downstream
      break;
    case 'multi':
      if (!touches || !Array.isArray(touches) || touches.length === 0) {
        throw new Error(`${context}: touches array is required for multi action`);
      }
      if (touches.length > 10) {
        throw new Error(`${context}: maximum 10 simultaneous touches supported`);
      }
      touches.forEach((touch, i) => {
        if (touch.x === undefined || touch.y === undefined) {
          throw new Error(`${context}: touches[${i}] must include x and y`);
        }
      });
      break;
    default:
      throw new Error(`${context}: invalid action ${action}`);
  }
}

/**
 * Handler for the input_touch tool
 */
export class InputTouchToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('input_touch', 'Touch input (tap/swipe/pinch/multi) with batching.', {
      type: 'object',
      properties: {
        ...actionProperties,
        actions: {
          type: 'array',
          description: 'Batch multiple touch actions executed in order',
          items: {
            type: 'object',
            properties: { ...actionProperties },
            required: ['action']
          }
        }
      }
    });
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
      actions.forEach((action, index) => validateTouchAction(action, `actions[${index}]`));
      return;
    }

    if (actions !== undefined && !Array.isArray(actions)) {
      throw new Error('actions must be an array');
    }

    validateTouchAction(params);
  }

  async execute(params) {
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const hasBatch = Array.isArray(params.actions) && params.actions.length > 0;
    const payload = hasBatch ? { actions: params.actions } : params;

    const result = await this.unityConnection.sendCommand('simulate_touch', payload);
    return result;
  }
}
