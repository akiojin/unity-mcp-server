/**
 * SPEC-85bab2a1: Unity AI Agent Window end-to-end validation.
 *
 * This suite exercises the full MCP tool workflow against a running Unity Editor:
 *   1. ai_session_open
 *   2. ai_session_message
 *   3. ai_session_execute (shell command)
 *   4. ai_session_close
 *
 * 前提条件:
 * - Unity Editor が UnityMCPServer プロジェクトを開いた状態で起動している
 * - MCP ブリッジが localhost:6400 で待機している
 * - UNITY_MCP_TEST_SKIP_UNITY が `true` でないこと
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import net from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { config } from '../../src/core/config.js';

function resolveServerCwd() {
  const currentFile = fileURLToPath(import.meta.url);
  const testsDir = path.dirname(currentFile);
  return path.resolve(testsDir, '..', '..');
}

function getUnityEndpoint() {
  const host = config.unity?.mcpHost || config.unity?.unityHost || 'localhost';
  const port = config.unity?.port ?? 6400;
  return { host, port };
}

async function isUnityReachable({ host, port }, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end(() => resolve(true));
    });

    const finalize = (result) => {
      socket.destroy();
      resolve(result);
    };

    socket.on('error', () => finalize(false));
    socket.setTimeout(timeoutMs, () => finalize(false));
  });
}

const SKIP = process.env.UNITY_MCP_TEST_SKIP_UNITY === 'true' || process.env.CI === 'true';
const UNITY_ENDPOINT = getUnityEndpoint();
const UNITY_AVAILABLE = await (SKIP ? Promise.resolve(false) : isUnityReachable(UNITY_ENDPOINT));
const SKIP_REASON = SKIP
  ? 'Unity-dependent E2E tests disabled (CI or UNITY_MCP_TEST_SKIP_UNITY=true)'
  : UNITY_AVAILABLE
    ? null
    : `Unity bridge not reachable at ${UNITY_ENDPOINT.host}:${UNITY_ENDPOINT.port}`;

if (SKIP_REASON) {
  describe('SPEC-85bab2a1: ai window e2e', { skip: SKIP_REASON }, () => {});
} else {
  describe('SPEC-85bab2a1: ai window e2e', { timeout: 120_000 }, () => {
    /** @type {Client | null} */
    let mcpClient = null;
    let activeSessionId = null;

    async function callTool(name, args) {
      const response = await mcpClient.callTool(name, args);
      assert.ok(response?.content?.length, `Tool ${name} returned no content`);

      const textEntry = response.content.find((item) => item.type === 'text');
      assert.ok(textEntry, `Tool ${name} response missing text content`);

      try {
        return JSON.parse(textEntry.text);
      } catch (error) {
        throw new Error(`Failed to parse ${name} response as JSON: ${textEntry.text}`);
      }
    }

    before(async () => {
      const serverCwd = resolveServerCwd();
      const env = { ...process.env };
      delete env.UNITY_MCP_TEST_SKIP_UNITY;
      if (!env.NODE_ENV) {
        env.NODE_ENV = 'production';
      }

      const transport = new StdioClientTransport({
        command: process.execPath,
        args: ['bin/unity-mcp-server'],
        cwd: serverCwd,
        env
      });

      mcpClient = new Client({
        name: 'spec-85bab2a1-e2e',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      await mcpClient.connect(transport);

      const tools = await mcpClient.listTools();
      const toolNames = (tools.tools ?? []).map((tool) => tool.name);
      assert(toolNames.includes('ai_session_open'), 'ai_session_open tool should be available');
    });

    after(async () => {
      if (mcpClient) {
        try {
          if (activeSessionId) {
            try {
              await mcpClient.callTool('ai_session_close', { sessionId: activeSessionId, saveTranscript: false });
            } catch {
              // best-effort cleanup only
            }
          }
          await mcpClient.close();
        } finally {
          mcpClient = null;
        }
      }
    });

    it('completes open → message → execute → close workflow', async () => {
      const openResult = await callTool('ai_session_open', {
        agentId: 'codex',
        workspace: 'workspace'
      });

      assert.ok(openResult.sessionId, 'Session id should be issued');
      assert.strictEqual(openResult.agent?.id, 'codex');
      activeSessionId = openResult.sessionId;

      const messageResult = await callTool('ai_session_message', {
        sessionId: activeSessionId,
        message: 'Hello from AI window e2e test'
      });

      assert.ok(messageResult.messageId, 'Message id should be present');
      assert.equal(messageResult.queued, true, 'Message should be queued');

      const executeResult = await callTool('ai_session_execute', {
        sessionId: activeSessionId,
        action: {
          type: 'shell_command',
          payload: {
            command: 'echo ai-window-e2e',
            workspace: 'workspace'
          }
        }
      });

      assert.ok(executeResult.actionId, 'Action id should be present');
      assert.equal(executeResult.status, 'succeeded', 'Action should finish successfully');

      const closeResult = await callTool('ai_session_close', {
        sessionId: activeSessionId,
        saveTranscript: false
      });

      assert.equal(closeResult.sessionId, activeSessionId, 'Closed session should match');
      assert.equal(closeResult.closed, true, 'Session should be reported as closed');

      activeSessionId = null;
    });
  });
}
