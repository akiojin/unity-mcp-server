import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerPingTool } from '../../../src/tools/system/ping.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

class MockServer {
  constructor() {
    this.handlers = new Map();
  }
  setRequestHandler(schema, handler) {
    const method = schema?.method ?? schema;
    this.handlers.set(method, handler);
    if (schema === ListToolsRequestSchema) this.listHandler = handler;
    if (schema === CallToolRequestSchema) this.callHandler = handler;
  }
}

class MockUnityConnection {
  constructor() {
    this.connected = true;
    this.connectCalls = 0;
  }
  isConnected() {
    return this.connected;
  }
  async connect() {
    this.connected = true;
    this.connectCalls += 1;
  }
  async sendCommand(_type, params = {}) {
    return { message: 'pong', echo: params.message ?? 'ping' };
  }
}

describe('system ping tool', () => {
  it('registers list/call handlers and handles ping', async () => {
    const server = new MockServer();
    const unity = new MockUnityConnection();
    registerPingTool(server, unity);

    const list = await server.listHandler();
    assert.equal(list.tools[0].name, 'ping');

    unity.connected = false;
    const res = await server.callHandler({ params: { name: 'ping', arguments: { message: 'hi' } } });
    assert.equal(unity.connectCalls, 1);
    assert.match(res.content[0].text, /Unity responded/);
    assert.match(res.content[0].text, /hi/);
  });

  it('returns error for unknown tool', async () => {
    const server = new MockServer();
    const unity = new MockUnityConnection();
    registerPingTool(server, unity);
    await assert.rejects(
      () => server.callHandler({ params: { name: 'nope', arguments: {} } }),
      /Tool not found/
    );
  });

  it('returns error when ping fails', async () => {
    const server = new MockServer();
    const unity = new MockUnityConnection();
    unity.sendCommand = async () => {
      throw new Error('offline');
    };
    registerPingTool(server, unity);
    const res = await server.callHandler({ params: { name: 'ping', arguments: {} } });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /Failed to ping Unity/);
  });
});
