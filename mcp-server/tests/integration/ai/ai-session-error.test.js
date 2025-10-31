/**
 * Error handling tests for SPEC-85bab2a1
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiSessionOpenHandler } from '../../../src/handlers/ai/AiSessionOpenHandler.js';
import { AiSessionMessageHandler } from '../../../src/handlers/ai/AiSessionMessageHandler.js';
import { AiSessionExecuteHandler } from '../../../src/handlers/ai/AiSessionExecuteHandler.js';
import { AiSessionCloseHandler } from '../../../src/handlers/ai/AiSessionCloseHandler.js';

const connection = null; // Unityへの接続は不要（テスト専用）

const openHandler = new AiSessionOpenHandler(connection);
const messageHandler = new AiSessionMessageHandler(connection);
const executeHandler = new AiSessionExecuteHandler(connection);
const closeHandler = new AiSessionCloseHandler(connection);

describe('SPEC-85bab2a1: ai_session_* error handling', () => {
  it('throws when opening with unknown agent', async () => {
    await assert.rejects(
      () => openHandler.execute({ agentId: 'unknown-agent' }),
      (error) => error.message.includes('AGENT_NOT_FOUND')
    );
  });

  it('throws when sending message to unknown session', async () => {
    await assert.rejects(
      () => messageHandler.execute({ sessionId: 'nope', message: 'hello' }),
      (error) => error.message.includes('SESSION_NOT_FOUND')
    );
  });

  it('throws when executing action for unknown session', async () => {
    await assert.rejects(
      () => executeHandler.execute({
        sessionId: 'nope',
        action: { type: 'shell_command', payload: { command: 'echo "hi"' } }
      }),
      (error) => error.message.includes('SESSION_NOT_FOUND')
    );
  });

  it('throws when closing unknown session', async () => {
    await assert.rejects(
      () => closeHandler.execute({ sessionId: 'missing', saveTranscript: false }),
      (error) => error.message.includes('SESSION_NOT_FOUND')
    );
  });
});
