import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { findAgent, getDefaultAgent } from './agentRegistry.js';
import { createSession } from './sessionStore.js';
import { aiSessionLogger } from './aiSessionLogger.js';

const WORKSPACE_OPTIONS = new Set(['workspace', 'project']);

export class AiSessionOpenHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('ai_session_open', 'Open an AI agent session', {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent identifier' },
        workspace: {
          type: 'string',
          enum: ['workspace', 'project'],
          default: 'workspace'
        },
        title: { type: 'string', description: 'Optional window title' }
      },
      required: ['agentId']
    });

    this.unityConnection = unityConnection;
  }

  async execute(params) {
    const agentId = params.agentId ?? getDefaultAgent()?.id;
    const agent = agentId ? findAgent(agentId) : null;

    if (!agent) {
      throw new Error(`AGENT_NOT_FOUND: Agent '${params.agentId}' is not registered`);
    }

    const workspace = params.workspace && WORKSPACE_OPTIONS.has(params.workspace)
      ? params.workspace
      : 'workspace';

    const session = createSession({
      agentId: agent.id,
      workspace,
      title: params.title
    });

    aiSessionLogger.info('Session opened', {
      sessionId: session.sessionId,
      agentId: agent.id,
      event: 'session_open'
    });

    if (this.unityConnection && process.env.UNITY_MCP_TEST_SKIP_UNITY !== 'true') {
      try {
        if (!this.unityConnection.isConnected()) {
          await this.unityConnection.connect();
        }

        const unityResponse = await this.unityConnection.sendCommand({
          command: 'ai_session_open',
          sessionId: session.sessionId,
          agentId: agent.id,
          workspace,
          title: params.title
        });

        if (unityResponse?.error) {
          throw new Error(unityResponse.error);
        }
      } catch (error) {
        aiSessionLogger.warn(`Unity notification failed for session open: ${error.message}`, {
          sessionId: session.sessionId,
          agentId: agent.id,
          event: 'session_open_unity_warn'
        });
      }
    }

    return {
      sessionId: session.sessionId,
      windowId: params.title ?? session.sessionId,
      agent: {
        id: agent.id,
        provider: agent.provider,
        capabilities: agent.capabilities
      }
    };
  }
}
