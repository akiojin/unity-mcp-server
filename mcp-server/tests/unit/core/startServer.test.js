import { describe, it, beforeEach } from 'node:test';
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
  let unityConnectCalls;
  let buildCalls;
  let watcherStartCalls;
  let lspStartCalls;

  beforeEach(() => {
    stdio = createStdioMock();
    createHandlersCalls = 0;
    loggerCalls = { setServer: 0, setLevel: 0 };
    unityConnectCalls = 0;
    buildCalls = 0;
    watcherStartCalls = 0;
    lspStartCalls = 0;

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
        error() {},
        warning() {},
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
      }
    };
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
});
