import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { closeSession } from './sessionStore.js';

export class AiSessionCloseHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('ai_session_close', 'Close an AI agent session', {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        saveTranscript: { type: 'boolean', default: false }
      },
      required: ['sessionId']
    });

    this.unityConnection = unityConnection;
  }

  async execute(params) {
    const session = closeSession(params.sessionId);

    if (!session) {
      throw new Error(`SESSION_NOT_FOUND: Session '${params.sessionId}' does not exist`);
    }

    // TODO: handle transcript export when Unity side supports it
    return {
      sessionId: params.sessionId,
      closed: true
    };
  }
}
