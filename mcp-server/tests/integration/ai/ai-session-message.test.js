/**
 * Contract Tests for SPEC-85bab2a1: AI Session Message
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createUnityConnection, safeDisconnect } from './aiTestUtils.js';
import { AiSessionOpenHandler } from '../../../src/handlers/ai/AiSessionOpenHandler.js';
import { AiSessionMessageHandler } from '../../../src/handlers/ai/AiSessionMessageHandler.js';
import { AiSessionCloseHandler } from '../../../src/handlers/ai/AiSessionCloseHandler.js';

describe('SPEC-85bab2a1: ai_session_message contract', () => {
  let connection;
  let openHandler;
  let messageHandler;
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
    messageHandler = new AiSessionMessageHandler(connection);
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

  it('enqueues a user message and returns message id', async () => {
    const response = await messageHandler.execute({
      sessionId,
      message: 'プレイヤー移動スクリプトの例を教えて'
    });

    assert.ok(response.messageId, 'messageId should be returned');
    assert.strictEqual(typeof response.queued, 'boolean', 'queued flag should exist');
  });

  it('rejects empty messages', async () => {
    await assert.rejects(
      () => messageHandler.execute({ sessionId, message: '' }),
      (error) => {
        assert.match(error.message, /validation|message/i);
        return true;
      }
    );
  });
});
