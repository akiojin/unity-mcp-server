/**
 * End-to-end flow test for SPEC-85bab2a1 (requires Unity Editor).
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { UnityConnection } from '../../../src/core/unityConnection.js';
import { AiSessionOpenHandler } from '../../../src/handlers/ai/AiSessionOpenHandler.js';
import { AiSessionMessageHandler } from '../../../src/handlers/ai/AiSessionMessageHandler.js';
import { AiSessionExecuteHandler } from '../../../src/handlers/ai/AiSessionExecuteHandler.js';
import { AiSessionCloseHandler } from '../../../src/handlers/ai/AiSessionCloseHandler.js';
import { getSession } from '../../../src/handlers/ai/sessionStore.js';

const SKIP = process.env.UNITY_MCP_TEST_SKIP_UNITY === 'true';

if (SKIP) {
  describe('SPEC-85bab2a1: AI window e2e (skipped - UNITY_MCP_TEST_SKIP_UNITY)', { skip: true }, () => {});
} else {
  describe('SPEC-85bab2a1: AI window e2e', () => {
    let connection;
    let openHandler;
    let messageHandler;
    let executeHandler;
    let closeHandler;
    let sessionId;

    before(async () => {
      connection = new UnityConnection();
      openHandler = new AiSessionOpenHandler(connection);
      messageHandler = new AiSessionMessageHandler(connection);
      executeHandler = new AiSessionExecuteHandler(connection);
      closeHandler = new AiSessionCloseHandler(connection);
    });

    after(async () => {
      try {
        if (sessionId) {
          await closeHandler.execute({ sessionId, saveTranscript: false });
        }
      } finally {
        connection?.disconnect();
      }
    });

    it('opens a session', async () => {
      const response = await openHandler.execute({ agentId: 'codex', workspace: 'workspace' });
      sessionId = response.sessionId;
      assert.ok(sessionId);
      assert.equal(response.agent.id, 'codex');
    });

    it('sends a chat message', async () => {
      const response = await messageHandler.execute({ sessionId, message: 'Hello from e2e test' });
      assert.ok(response.messageId);
      assert.equal(response.queued, true);
    });

    it('executes a shell command proposal', async () => {
      const response = await executeHandler.execute({
        sessionId,
        action: {
          type: 'shell_command',
          payload: {
            command: 'echo "ai-window-e2e"',
            workspace: 'workspace'
          }
        }
      });

      assert.ok(response.actionId);
      const session = getSession(sessionId);
      const action = session?.actions.find((a) => a.actionId === response.actionId);
      assert.ok(action);
      assert.equal(action.status, 'succeeded');
    });
  });
}
