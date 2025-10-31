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

    if (this.unityConnection && process.env.UNITY_MCP_TEST_SKIP_UNITY !== 'true') {
      try {
        if (!this.unityConnection.isConnected()) {
          await this.unityConnection.connect();
        }

        const unityResponse = await this.unityConnection.sendCommand({
          command: 'ai_session_close',
          sessionId: params.sessionId,
          saveTranscript: params.saveTranscript ?? false
        });

        if (unityResponse?.error) {
          throw new Error(unityResponse.error);
        }
      } catch (error) {
        console.warn(`[AI] Unable to notify Unity about session close: ${error.message}`);
      }
    }

    // TODO: handle transcript export when Unity side supports it
    return {
      sessionId: params.sessionId,
      closed: true
    };
  }
}
