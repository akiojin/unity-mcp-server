import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../../../src/core/server.js';

function createStdioMock() {
  const instances = [];
  class StdioMock {
    constructor({ serverInfo, capabilities } = {}) {
      this.serverInfo = serverInfo;
      this.capabilities = capabilities;
      this._requestHandlers = new Map();
      instances.push(this);
    }
    setRequestHandler(method, handler) {
      this._requestHandlers.set(method, handler);
    }
    async start() {}
    async close() {}
    sendNotification() {}
  }
  return { StdioMock, instances };
}

describe('startServer (deps injection)', () => {
  let deps;
  let stdio;
  let createHandlersCalls;
  let loggerCalls;
  let loggerWarnings;
  let loggerErrors;
  let unityConnectCalls;
  let buildCalls;
  let watcherStartCalls;
  let lspStartCalls;
  let httpStartCalls;
  let originalSigint;
  let originalSigterm;
  let originalExit;

  beforeEach(() => {
    originalSigint = process.listeners('SIGINT').slice();
    originalSigterm = process.listeners('SIGTERM').slice();
    stdio = createStdioMock();
    createHandlersCalls = 0;
    loggerCalls = { setServer: 0, setLevel: 0 };
    loggerWarnings = [];
    loggerErrors = [];
    unityConnectCalls = 0;
    buildCalls = 0;
    watcherStartCalls = 0;
    lspStartCalls = 0;
    httpStartCalls = 0;

    deps = {
      StdioRpcServer: stdio.StdioMock,
      config: {
        server: { name: 'test-unity-mcp', version: '1.0.0' },
        unity: { unityHost: 'localhost', mcpHost: 'localhost', port: 6400, commandTimeout: 30000 },
        http: { enabled: false, host: '0.0.0.0', port: 6401, healthPath: '/healthz', allowedHosts: [] },
        telemetry: { enabled: false }
      },
      logger: {
        info() {},
        error(message) {
          loggerErrors.push(message);
        },
        warning(message) {
          loggerWarnings.push(message);
        },
        setLevel() {
          loggerCalls.setLevel += 1;
        },
        setServer() {
          loggerCalls.setServer += 1;
        }
      },
      UnityConnection: class {
        constructor() {
          this.connect = async () => {
            unityConnectCalls += 1;
          };
          this.disconnect = () => {};
          this.on = () => {};
        }
      },
      createHandlers: () => {
        createHandlersCalls += 1;
        return new Map([
          [
            'ping',
            {
              name: 'ping',
              description: 'ping',
              inputSchema: { type: 'object' },
              getDefinition: () => ({
                name: 'ping',
                description: 'ping',
                inputSchema: { type: 'object' }
              }),
              handle: async () => ({ status: 'success', result: { ok: true } })
            }
          ],
          [
            'error_tool',
            {
              name: 'error_tool',
              description: 'error tool',
              inputSchema: { type: 'object' },
              getDefinition: () => ({
                name: 'error_tool',
                description: 'error tool',
                inputSchema: { type: 'object' }
              }),
              handle: async () => ({
                status: 'error',
                error: 'bad',
                code: 'E_BAD',
                details: { reason: 'fail' }
              })
            }
          ],
          [
            'empty_tool',
            {
              name: 'empty_tool',
              description: 'empty tool',
              inputSchema: { type: 'object' },
              getDefinition: () => ({
                name: 'empty_tool',
                description: 'empty tool',
                inputSchema: { type: 'object' }
              }),
              handle: async () => ({ status: 'success', result: null })
            }
          ],
          [
            'throw_tool',
            {
              name: 'throw_tool',
              description: 'throw tool',
              inputSchema: { type: 'object' },
              getDefinition: () => ({
                name: 'throw_tool',
                description: 'throw tool',
                inputSchema: { type: 'object' }
              }),
              handle: async () => {
                throw new Error('boom');
              }
            }
          ]
        ]);
      },
      LspProcessManager: class {
        async ensureStarted() {
          lspStartCalls += 1;
        }
        async stop() {}
      },
      IndexWatcher: class {
        start() {
          watcherStartCalls += 1;
        }
        stop() {}
      },
      CodeIndex: class {
        constructor() {
          this.disabled = false;
        }
        async isReady() {
          return false;
        }
      },
      CodeIndexBuildToolHandler: class {
        async execute() {
          buildCalls += 1;
          return { success: true, jobId: 'job-1' };
        }
      },
      createHttpServer: () => ({
        start: async () => {
          httpStartCalls += 1;
        },
        close: async () => {}
      })
    };
  });

  afterEach(() => {
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    for (const listener of originalSigint) process.on('SIGINT', listener);
    for (const listener of originalSigterm) process.on('SIGTERM', listener);
    if (originalExit) process.exit = originalExit;
  });

  it('registers stdio handlers and serves tool manifest without initializing handlers', async () => {
    await startServer({ deps });

    const server = stdio.instances[0];
    assert.ok(server);
    assert.ok(server._requestHandlers.has('tools/list'));
    assert.ok(server._requestHandlers.has('tools/call'));
    assert.ok(server._requestHandlers.has('logging/setLevel'));

    const listHandler = server._requestHandlers.get('tools/list');
    const listResult = await listHandler();
    assert.ok(Array.isArray(listResult.tools));
    assert.equal(createHandlersCalls, 0);
  });

  it('returns error text when tool is missing', async () => {
    await startServer({ deps });
    const server = stdio.instances[0];
    const callHandler = server._requestHandlers.get('tools/call');
    await assert.rejects(
      () => callHandler({ params: { name: 'missing', arguments: {} } }),
      /Tool not found/
    );
  });

  it('applies logging/setLevel', async () => {
    await startServer({ deps });
    const server = stdio.instances[0];
    const handler = server._requestHandlers.get('logging/setLevel');
    await handler({ params: { level: 'debug' } });
    assert.equal(loggerCalls.setLevel, 1);
  });

  it('formats handler error responses', async () => {
    await startServer({ deps });
    const server = stdio.instances[0];
    const callHandler = server._requestHandlers.get('tools/call');
    const response = await callHandler({ params: { name: 'error_tool', arguments: {} } });
    const text = response.content[0].text;
    assert.match(text, /Error: bad/);
    assert.match(text, /Code: E_BAD/);
    assert.match(text, /Details:/);
  });

  it('returns fallback text when handler returns null result', async () => {
    await startServer({ deps });
    const server = stdio.instances[0];
    const callHandler = server._requestHandlers.get('tools/call');
    const response = await callHandler({ params: { name: 'empty_tool', arguments: {} } });
    assert.match(response.content[0].text, /Operation completed successfully/);
  });

  it('returns error text when handler throws', async () => {
    await startServer({ deps });
    const server = stdio.instances[0];
    const callHandler = server._requestHandlers.get('tools/call');
    const response = await callHandler({ params: { name: 'throw_tool', arguments: {} } });
    assert.match(response.content[0].text, /Error: boom/);
  });

  it('starts post-init work after initialized notification', async () => {
    await startServer({ deps });
    const server = stdio.instances[0];
    const listHandler = server._requestHandlers.get('tools/list');
    await listHandler();
    server.oninitialized();

    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(loggerCalls.setServer, 1);
    assert.equal(unityConnectCalls, 1);
    assert.equal(lspStartCalls, 1);
    assert.equal(watcherStartCalls, 1);
    assert.equal(buildCalls, 1);
  });

  it('starts http server when enabled', async () => {
    await startServer({ deps, http: { enabled: true } });
    const server = stdio.instances[0];
    const listHandler = server._requestHandlers.get('tools/list');
    await listHandler();
    server.oninitialized();

    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(httpStartCalls, 1);
  });

  it('skips code index auto-build when disabled', async () => {
    deps.CodeIndex = class {
      constructor() {
        this.disabled = true;
        this.disableReason = 'disabled';
      }
      async isReady() {
        return false;
      }
    };

    await startServer({ deps });
    const server = stdio.instances[0];
    const listHandler = server._requestHandlers.get('tools/list');
    await listHandler();
    server.oninitialized();

    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(buildCalls, 0);
    assert.ok(loggerWarnings.some(msg => String(msg).includes('Code index disabled')));
  });

  it('skips code index auto-build when ready', async () => {
    deps.CodeIndex = class {
      constructor() {
        this.disabled = false;
      }
      async isReady() {
        return true;
      }
    };

    await startServer({ deps });
    const server = stdio.instances[0];
    const listHandler = server._requestHandlers.get('tools/list');
    await listHandler();
    server.oninitialized();

    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(buildCalls, 0);
  });

  it('runs post-init work immediately when stdio is disabled', async () => {
    await startServer({ deps, stdioEnabled: false });

    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(unityConnectCalls, 1);
    assert.equal(lspStartCalls, 1);
    assert.equal(watcherStartCalls, 1);
    assert.equal(buildCalls, 1);
  });

  it('exits when http start fails in http-only mode', async () => {
    let exitCode;
    originalExit = process.exit;
    process.exit = code => {
      exitCode = code;
    };

    deps.createHttpServer = () => ({
      start: async () => {
        throw new Error('http failed');
      },
      close: async () => {}
    });

    await startServer({ deps, stdioEnabled: false, http: { enabled: true } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(exitCode, 1);
  });
});
