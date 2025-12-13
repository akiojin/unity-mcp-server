import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

function writeJsonLine(stream, message) {
  stream.write(`${JSON.stringify(message)}\n`);
}

function createLineReader(stream) {
  let buffer = '';
  const listeners = new Set();

  stream.on('data', chunk => {
    buffer += chunk.toString('utf8');
    while (true) {
      const nl = buffer.indexOf('\n');
      if (nl === -1) break;
      const line = buffer.slice(0, nl).replace(/\r$/, '');
      buffer = buffer.slice(nl + 1);
      if (!line.trim()) continue;
      for (const fn of listeners) fn(line);
    }
  });

  return {
    onLine(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      t.unref?.();
    })
  ]);
}

describe('Startup timeout regression', () => {
  it('completes MCP initialize + tools/list under 10 seconds', async () => {
    const startedAt = Date.now();
    const proc = spawn(process.execPath, ['bin/unity-mcp-server.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LOG_LEVEL: 'error',
        UNITY_MCP_HOST: 'localhost',
        UNITY_PORT: '6400'
      }
    });

    let stderr = '';
    proc.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8');
      if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
    });

    const reader = createLineReader(proc.stdout);

    const waitForId = id =>
      new Promise((resolve, reject) => {
        const off = reader.onLine(line => {
          try {
            const msg = JSON.parse(line);
            if (msg?.id === id) {
              off();
              resolve(msg);
            }
          } catch (e) {
            off();
            reject(e);
          }
        });
      });

    try {
      writeJsonLine(proc.stdin, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'startup-test', version: '0.0.0' }
        }
      });

      const initResponse = await withTimeout(waitForId(1), 10_000, 'initialize response');
      assert.equal(initResponse.jsonrpc, '2.0');
      assert.ok(initResponse.result?.serverInfo?.name);
      assert.ok(initResponse.result?.serverInfo?.version);
      assert.ok(initResponse.result?.capabilities?.tools);

      writeJsonLine(proc.stdin, {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {}
      });

      writeJsonLine(proc.stdin, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });

      const toolsResponse = await withTimeout(waitForId(2), 10_000, 'tools/list response');
      assert.equal(toolsResponse.jsonrpc, '2.0');
      assert.ok(Array.isArray(toolsResponse.result?.tools));
      assert.ok(toolsResponse.result.tools.length > 0);

      const durationMs = Date.now() - startedAt;
      assert.ok(
        durationMs < 10_000,
        `Startup handshake exceeded 10s: ${durationMs}ms\n--- stderr ---\n${stderr}`
      );
    } finally {
      try {
        proc.kill('SIGTERM');
      } catch {}
      await Promise.race([
        new Promise(resolve => proc.once('exit', resolve)),
        new Promise(resolve => setTimeout(resolve, 2000).unref())
      ]);
      try {
        proc.kill('SIGKILL');
      } catch {}
    }
  });
});
