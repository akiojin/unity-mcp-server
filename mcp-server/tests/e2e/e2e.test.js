import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function resolveServerCwd() {
  const currentFile = fileURLToPath(import.meta.url);
  const testsDir = path.dirname(currentFile);
  return path.resolve(testsDir, '..', '..');
}

describe('MCP server end-to-end (STDIO transport)', () => {
  /** @type {Client | null} */
  let mcpClient = null;

  before(async () => {
    const env = { ...process.env };
    // Disable Unity-dependent behavior to keep the test self-contained
    env.UNITY_MCP_TEST_SKIP_UNITY = 'true';
    env.NODE_ENV = env.NODE_ENV || 'test';
    if (!env.LOG_LEVEL) {
      env.LOG_LEVEL = 'error';
    }

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['bin/unity-mcp-server'],
      cwd: resolveServerCwd(),
      env
    });

    mcpClient = new Client({
      name: 'stdio-e2e',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await mcpClient.connect(transport);

    // Prime the server by requesting tool metadata once
    await mcpClient.listTools();
  });

  after(async () => {
    if (mcpClient) {
      await mcpClient.close();
      mcpClient = null;
    }
  });

  it('lists registered tools', async () => {
    const tools = await mcpClient.listTools();
    assert(Array.isArray(tools.tools));
    assert.ok(tools.tools.length > 0, 'Tool list should not be empty');

    const pingTool = tools.tools.find((tool) => tool.name === 'system_ping');
    assert.ok(pingTool, 'system_ping tool should be advertised');
  });

  it('executes system_ping successfully in skip-unity mode', async () => {
    const response = await mcpClient.callTool('system_ping', { message: 'hello e2e' });
    assert.ok(response.content?.length, 'Tool response should include content');

    const entry = response.content.find((item) => item.type === 'text');
    assert.ok(entry, 'Response should include textual payload');

    const payload = JSON.parse(entry.text);
    assert.equal(payload.message, 'pong');
    assert.equal(payload.echo, 'hello e2e');
  });

  it('reports errors for unknown tools', async () => {
    await assert.rejects(
      async () => mcpClient.callTool('nonexistent_tool', {}),
      /Tool not found: nonexistent_tool/
    );
  });
});
