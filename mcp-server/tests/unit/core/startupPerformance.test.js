import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';

function createJsonRpcClient(proc) {
  let stdoutBuffer = '';
  const pending = new Map();

  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', chunk => {
    stdoutBuffer += chunk;
    while (true) {
      const newlineIndex = stdoutBuffer.indexOf('\n');
      if (newlineIndex === -1) break;

      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);

      if (!line) continue;

      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        const err = new Error(`Non-JSON output on stdout: ${line}`);
        err.cause = error;
        for (const { reject } of pending.values()) reject(err);
        pending.clear();
        return;
      }

      if (message && typeof message === 'object' && 'id' in message) {
        const entry = pending.get(message.id);
        if (entry) {
          pending.delete(message.id);
          entry.resolve(message);
        }
      }
    }
  });

  const send = message => {
    proc.stdin.write(`${JSON.stringify(message)}\n`);
  };

  const request = (id, method, params) => {
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      send({ jsonrpc: '2.0', id, method, params });
    });
  };

  const notify = (method, params) => {
    const message = { jsonrpc: '2.0', method };
    if (params !== undefined) message.params = params;
    send(message);
  };

  const close = () => {
    for (const { reject } of pending.values()) {
      reject(new Error('Process closed before response'));
    }
    pending.clear();
  };

  return { request, notify, close };
}

async function withTimeout(promise, timeoutMs, label) {
  let timeout;
  const timerPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label || 'Operation'} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timerPromise]);
  } finally {
    clearTimeout(timeout);
  }
}

describe('Server startup (NFR)', () => {
  it('should complete MCP initialize + tools/list within 10 seconds', async () => {
    const start = Date.now();

    const proc = spawn(process.execPath, ['src/core/server.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DISABLE_AUTO_RECONNECT: 'true',
        LOG_LEVEL: 'error'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const client = createJsonRpcClient(proc);
    const stderr = [];
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', chunk => stderr.push(chunk));

    proc.once('exit', () => client.close());

    try {
      const initResponse = await withTimeout(
        client.request(1, 'initialize', {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'startup-test', version: '0.0.0' }
        }),
        10_000,
        'initialize'
      );
      assert.equal(initResponse?.result?.protocolVersion, LATEST_PROTOCOL_VERSION);

      client.notify('notifications/initialized');

      const toolsResponse = await withTimeout(
        client.request(2, 'tools/list', {}),
        10_000,
        'tools/list'
      );

      const durationMs = Date.now() - start;
      assert.ok(
        durationMs <= 10_000,
        `Startup exceeded 10s (${durationMs}ms). stderr:\n${stderr.join('')}`
      );

      assert.ok(Array.isArray(toolsResponse?.result?.tools));
      assert.ok(toolsResponse.result.tools.length > 0);
    } finally {
      proc.kill('SIGINT');
      await withTimeout(once(proc, 'exit'), 2_000, 'server shutdown').catch(() => {
        proc.kill('SIGKILL');
      });
    }
  });
});
