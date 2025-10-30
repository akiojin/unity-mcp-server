/**
 * Contract tests for ai_stream_chunk dispatcher (Node -> Unity push)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiStreamDispatcher } from '../../../src/handlers/ai/AiStreamDispatcher.js';

describe('SPEC-85bab2a1: ai_stream_chunk push contract', () => {
  it('forwards chunks to Unity with the expected envelope', () => {
    const sent = [];
    const fakeConnection = {
      sendNotification: (command, payload) => {
        sent.push({ command, payload });
      }
    };

    const dispatcher = new AiStreamDispatcher(fakeConnection);
    dispatcher.pushChunk({
      sessionId: 'sess-123',
      actionId: 'act-456',
      chunk: 'partial output',
      isFinal: false
    });

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].command, 'ai_stream_chunk');
    assert.deepStrictEqual(sent[0].payload, {
      sessionId: 'sess-123',
      actionId: 'act-456',
      chunk: 'partial output',
      isFinal: false
    });
  });
});
