import { BaseToolHandler } from '../base/BaseToolHandler.js';

const actionProperties = {
  action: {
    type: 'string',
    enum: ['button', 'stick', 'trigger', 'dpad'],
    description: 'The gamepad action to perform'
  },
  button: {
    type: 'string',
    description: 'Button name (a/cross, b/circle, x/square, y/triangle, start, select, etc.)'
  },
  buttonAction: {
    type: 'string',
    enum: ['press', 'release'],
    description: 'Button action (press or release)'
  },
  stick: {
    type: 'string',
    enum: ['left', 'right'],
    description: 'Which analog stick to control'
  },
  x: {
    type: 'number',
    minimum: -1,
    maximum: 1,
    description: 'Horizontal axis value for stick (-1 to 1)'
  },
  y: {
    type: 'number',
    minimum: -1,
    maximum: 1,
    description: 'Vertical axis value for stick (-1 to 1)'
  },
  trigger: {
    type: 'string',
    enum: ['left', 'right'],
    description: 'Which trigger to control'
  },
  value: {
    type: 'number',
    minimum: 0,
    maximum: 1,
    description: 'Trigger pressure value (0 to 1)'
  },
  direction: {
    type: 'string',
    enum: ['up', 'down', 'left', 'right', 'none'],
    description: 'D-pad direction'
  },
  holdSeconds: {
    type: 'number',
    minimum: 0,
    description: 'Automatically reset stick/button/trigger/dpad after this many seconds'
  }
};

function validateGamepadAction(params, context = 'action') {
  if (!params || typeof params !== 'object') {
    throw new Error(`${context} must be an object`);
  }

  const { action, button, x, y, value, direction, holdSeconds } = params;

  if (!action) {
    throw new Error(`${context}: action is required`);
  }

  switch (action) {
    case 'button':
      if (!button) {
        throw new Error(`${context}: button is required for button action`);
      }
      break;
    case 'stick':
      if (x === undefined || y === undefined) {
        throw new Error(`${context}: x and y values are required for stick action`);
      }
      if (x < -1 || x > 1 || y < -1 || y > 1) {
        throw new Error(`${context}: stick values must be between -1 and 1`);
      }
      break;
    case 'trigger':
      if (value === undefined) {
        throw new Error(`${context}: value is required for trigger action`);
      }
      if (value < 0 || value > 1) {
        throw new Error(`${context}: trigger value must be between 0 and 1`);
      }
      break;
    case 'dpad':
      if (!direction) {
        throw new Error(`${context}: direction is required for dpad action`);
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
 * Handler for the input_gamepad tool
 */
export class InputGamepadToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'input_gamepad',
      'Gamepad input (buttons/sticks/triggers/dpad) with batching and auto-hold.',
      {
        type: 'object',
        properties: {
          ...actionProperties,
          actions: {
            type: 'array',
            description: 'Batch multiple gamepad actions executed in order',
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
      actions.forEach((action, index) => validateGamepadAction(action, `actions[${index}]`));
      return;
    }

    if (actions !== undefined && !Array.isArray(actions)) {
      throw new Error('actions must be an array');
    }

    validateGamepadAction(params);
  }

  async execute(params) {
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const hasBatch = Array.isArray(params.actions) && params.actions.length > 0;
    const payload = hasBatch ? { actions: params.actions } : params;

    const result = await this.unityConnection.sendCommand('input_gamepad', payload);
    return result;
  }
}
