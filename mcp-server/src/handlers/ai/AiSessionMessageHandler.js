import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { addMessage, getSession } from './sessionStore.js';

export class AiSessionMessageHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('ai_session_message', 'Send a message to an AI session', {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        message: { type: 'string', minLength: 1 },
        attachments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              path: { type: 'string' },
              description: { type: 'string' }
            },
            required: ['type']
          }
        }
      },
      required: ['sessionId', 'message']
    });

    this.unityConnection = unityConnection;
  }

  async execute(params) {
    const session = getSession(params.sessionId);
    if (!session) {
      throw new Error(`SESSION_NOT_FOUND: Session '${params.sessionId}' does not exist`);
    }

    const trimmed = params.message.trim();
    if (!trimmed) {
      throw new Error('VALIDATION_ERROR: message cannot be empty');
    }

    const message = addMessage(params.sessionId, {
      sender: 'user',
      content: trimmed
    });

    if (!message) {
      throw new Error('SESSION_NOT_FOUND: Unable to append message');
    }

    return {
      messageId: message.messageId,
      queued: true
    };
  }
}
