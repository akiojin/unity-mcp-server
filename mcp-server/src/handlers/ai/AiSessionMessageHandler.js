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

    if (this.unityConnection && process.env.UNITY_MCP_TEST_SKIP_UNITY !== 'true') {
      try {
        if (!this.unityConnection.isConnected()) {
          await this.unityConnection.connect();
        }

        const unityResponse = await this.unityConnection.sendCommand({
          command: 'ai_session_message',
          sessionId: params.sessionId,
          message: trimmed
        });

        if (unityResponse?.error) {
          throw new Error(unityResponse.error);
        }
      } catch (error) {
        console.warn(`[AI] Unable to notify Unity about session message: ${error.message}`);
      }
    }

    return {
      messageId: message.messageId,
      queued: true
    };
  }
}
