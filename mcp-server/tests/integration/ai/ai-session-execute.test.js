/**
 * Contract Tests for SPEC-85bab2a1: AI Session Execute
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createUnityConnection, safeDisconnect } from './aiTestUtils.js';
import { AiSessionOpenHandler } from '../../../src/handlers/ai/AiSessionOpenHandler.js';
import { AiSessionExecuteHandler } from '../../../src/handlers/ai/AiSessionExecuteHandler.js';
import { AiSessionCloseHandler } from '../../../src/handlers/ai/AiSessionCloseHandler.js';

describe('SPEC-85bab2a1: ai_session_execute contract', () => {
  let connection;
  let openHandler;
  let executeHandler;
  let closeHandler;
  let sessionId;

  before(async () => {
    connection = await createUnityConnection();
  });

  after(() => {
    safeDisconnect(connection);
  });

  beforeEach(async () => {
    openHandler = new AiSessionOpenHandler(connection);
    executeHandler = new AiSessionExecuteHandler(connection);
    closeHandler = new AiSessionCloseHandler(connection);

    const response = await openHandler.execute({ agentId: 'codex' });
    sessionId = response.sessionId;
  });

  afterEach(async () => {
    if (sessionId) {
      await closeHandler.execute({ sessionId });
      sessionId = null;
    }
  });

  it('queues shell command execution proposal', async () => {
    const response = await executeHandler.execute({
      sessionId,
      action: {
        type: 'shell_command',
        payload: {
          command: 'echo integration-test'
        }
      }
    });

    assert.ok(response.actionId, 'actionId should be returned');
    assert.match(response.status, /pending|queued|started/);
  });

  it('rejects unsupported action types', async () => {
    await assert.rejects(
      () => executeHandler.execute({
        sessionId,
        action: {
          type: 'unsupported',
          payload: {}
        }
      }),
      (error) => {
        assert.match(error.message, /ACTION_TYPE_NOT_SUPPORTED/i);
        return true;
      }
    );
  });
});
