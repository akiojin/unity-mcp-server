/**
 * Contract Tests for SPEC-85bab2a1: AI Session Close
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createUnityConnection, safeDisconnect } from './aiTestUtils.js';
import { AiSessionOpenHandler } from '../../../src/handlers/ai/AiSessionOpenHandler.js';
import { AiSessionCloseHandler } from '../../../src/handlers/ai/AiSessionCloseHandler.js';

describe('SPEC-85bab2a1: ai_session_close contract', () => {
  let connection;
  let openHandler;
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
    closeHandler = new AiSessionCloseHandler(connection);

    const response = await openHandler.execute({ agentId: 'codex' });
    sessionId = response.sessionId;
  });

  it('closes session and confirms result', async () => {
    const response = await closeHandler.execute({ sessionId, saveTranscript: false });
    assert.strictEqual(response.sessionId, sessionId);
    assert.strictEqual(response.closed, true);
    sessionId = null; // prevent after hook from double closing
  });

  it('returns error when session does not exist', async () => {
    await closeHandler.execute({ sessionId, saveTranscript: false });
    sessionId = null;

    await assert.rejects(
      () => closeHandler.execute({ sessionId: 'unknown' }),
      (error) => {
        assert.match(error.message, /SESSION_NOT_FOUND/i);
        return true;
      }
    );
  });
});
