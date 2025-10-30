import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { addAction, getSession } from './sessionStore.js';

const SUPPORTED_ACTIONS = new Set(['code_generate', 'test_run', 'shell_command']);

export class AiSessionExecuteHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('ai_session_execute', 'Execute an action suggested by the AI agent', {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        action: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['code_generate', 'test_run', 'shell_command']
            },
            payload: { type: 'object' },
            dryRun: { type: 'boolean', default: false }
          },
          required: ['type', 'payload']
        }
      },
      required: ['sessionId', 'action']
    });

    this.unityConnection = unityConnection;
  }

  async execute(params) {
    const session = getSession(params.sessionId);
    if (!session) {
      throw new Error(`SESSION_NOT_FOUND: Session '${params.sessionId}' does not exist`);
    }

    const actionType = params.action.type;
    if (!SUPPORTED_ACTIONS.has(actionType)) {
      throw new Error(`ACTION_TYPE_NOT_SUPPORTED: '${actionType}'`);
    }

    const action = addAction(params.sessionId, {
      type: actionType,
      payload: params.action.payload
    });

    if (!action) {
      throw new Error('SESSION_NOT_FOUND: Unable to register action');
    }

    return {
      actionId: action.actionId,
      status: action.status
    };
  }
}
