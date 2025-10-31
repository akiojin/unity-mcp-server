/**
 * Contract Tests for SPEC-85bab2a1: AI Session Open
 *
 * 前提条件:
 * - Unity Editorが起動している
 * - UnityMCPServerプロジェクトが開いている
 * - TCP接続がlocalhost:6400で待機している
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createUnityConnection, safeDisconnect } from './aiTestUtils.js';
import { AiSessionOpenHandler } from '../../../src/handlers/ai/AiSessionOpenHandler.js';
import { AiSessionCloseHandler } from '../../../src/handlers/ai/AiSessionCloseHandler.js';

describe('SPEC-85bab2a1: ai_session_open contract', () => {
  let connection;
  let openHandler;
  let closeHandler;

  before(async () => {
    connection = await createUnityConnection();
  });

  after(() => {
    safeDisconnect(connection);
  });

  beforeEach(() => {
    openHandler = new AiSessionOpenHandler(connection);
    closeHandler = new AiSessionCloseHandler(connection);
  });

  it('opens a Codex session in workspace scope and returns session metadata', async () => {
    const response = await openHandler.execute({
      agentId: 'codex',
      workspace: 'workspace'
    });

    assert.ok(response.sessionId, 'sessionId should be issued');
    assert.ok(response.agent, 'agent payload should be returned');
    assert.strictEqual(response.agent.id, 'codex', 'agent id should echo codex');
    assert.ok(Array.isArray(response.agent.capabilities), 'agent capabilities should be list');

    await closeHandler.execute({ sessionId: response.sessionId });
  });

  it('rejects unknown agent ids', async () => {
    await assert.rejects(
      async () => {
        await openHandler.execute({ agentId: 'non-existent' });
      },
      (error) => {
        assert.match(error.message, /AGENT_NOT_FOUND|unsupported/i);
        return true;
      },
      'should raise descriptive error for unknown agent'
    );
  });
});
