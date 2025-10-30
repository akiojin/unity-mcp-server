import { randomUUID } from 'node:crypto';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { findAgent, getDefaultAgent } from './agentRegistry.js';
import { createSession } from './sessionStore.js';

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
