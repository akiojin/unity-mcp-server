import process from 'node:process';

const JSONRPC_VERSION = '2.0';

const DEFAULT_SUPPORTED_PROTOCOL_VERSIONS = [
  // Keep in sync with MCP SDK's supported list (best-effort).
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
  '2024-10-07'
];

function safeJsonParse(line) {
  try {
    return { ok: true, value: JSON.parse(line) };
  } catch (error) {
    return { ok: false, error };
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function buildError(code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return error;
}

/**
 * Lightweight stdio JSON-RPC server for MCP.
 *
 * Avoids importing the MCP TypeScript SDK to keep cold start times low.
 * Protocol: newline-delimited JSON (same framing as @modelcontextprotocol/sdk stdio transport).
 */
export class StdioRpcServer {
  constructor({
    serverInfo,
    capabilities,
    instructions,
    supportedProtocolVersions = DEFAULT_SUPPORTED_PROTOCOL_VERSIONS
  } = {}) {
    this.serverInfo = serverInfo || { name: 'unity-mcp-server', version: '0.0.0' };
    this.capabilities = capabilities || { tools: { listChanged: true } };
    this.instructions = instructions;
    this.supportedProtocolVersions = supportedProtocolVersions;

    this._requestHandlers = new Map();
    this._notificationHandlers = new Map();
    this._buffer = '';
    this._started = false;
    this._writeChain = Promise.resolve();

    this.oninitialized = undefined;
    this.onclose = undefined;
    this.onerror = undefined;

    this._client = {
      protocolVersion: undefined,
      capabilities: undefined,
      clientInfo: undefined,
      loggingLevel: undefined
    };

    this._onData = chunk => this._handleChunk(chunk);
    this._onError = err => this._emitError(err);
    this._onEnd = () => this._handleClose();
  }

  setRequestHandler(method, handler) {
    if (typeof method !== 'string') {
      throw new TypeError('setRequestHandler: method must be a string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('setRequestHandler: handler must be a function');
    }
    this._requestHandlers.set(method, handler);
  }

  setNotificationHandler(method, handler) {
    if (typeof method !== 'string') {
      throw new TypeError('setNotificationHandler: method must be a string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('setNotificationHandler: handler must be a function');
    }
    this._notificationHandlers.set(method, handler);
  }

  async start() {
    if (this._started) throw new Error('StdioRpcServer already started');
    this._started = true;
    process.stdin.on('data', this._onData);
    process.stdin.on('error', this._onError);
    process.stdin.on('end', this._onEnd);
  }

  async close() {
    if (!this._started) return;
    process.stdin.off('data', this._onData);
    process.stdin.off('error', this._onError);
    process.stdin.off('end', this._onEnd);
    this._buffer = '';
    this._started = false;
    this._handleClose();
  }

  sendLoggingMessage(params) {
    // MCP logging notification
    this.sendNotification('notifications/message', params);
  }

  sendToolListChanged() {
    this.sendNotification('notifications/tools/list_changed', {});
  }

  sendNotification(method, params) {
    this._enqueueWrite({ jsonrpc: JSONRPC_VERSION, method, params });
  }

  _handleChunk(chunk) {
    this._buffer += chunk.toString('utf8');

    while (true) {
      const nl = this._buffer.indexOf('\n');
      if (nl === -1) break;
      const line = this._buffer.slice(0, nl).replace(/\r$/, '');
      this._buffer = this._buffer.slice(nl + 1);

      if (!line.trim()) continue;
      const parsed = safeJsonParse(line);
      if (!parsed.ok) {
        // Parse error: cannot determine id reliably, so emit server error and continue.
        this._emitError(parsed.error);
        continue;
      }
      void this._handleMessage(parsed.value);
    }
  }

  async _handleMessage(message) {
    if (!isObject(message)) return;

    const { id, method, params } = message;
    if (typeof method !== 'string') return;

    const isRequest = id !== undefined && id !== null;
    if (!isRequest) {
      await this._handleNotification(method, params);
      return;
    }
    await this._handleRequest(id, method, params);
  }

  async _handleNotification(method, params) {
    if (method === 'notifications/initialized') {
      try {
        if (typeof this.oninitialized === 'function') this.oninitialized();
      } catch (e) {
        this._emitError(e);
      }
      return;
    }

    const handler = this._notificationHandlers.get(method);
    if (!handler) return;
    try {
      await handler({ method, params });
    } catch (e) {
      this._emitError(e);
    }
  }

  async _handleRequest(id, method, params) {
    try {
      if (method === 'initialize') {
        const result = this._handleInitialize(params);
        this._sendResult(id, result);
        return;
      }

      const handler = this._requestHandlers.get(method);
      if (!handler) {
        this._sendError(id, buildError(-32601, `Method not found: ${method}`));
        return;
      }

      const result = await handler({ method, params });
      this._sendResult(id, result);
    } catch (e) {
      this._sendError(
        id,
        buildError(-32603, e instanceof Error ? e.message : 'Internal error', {
          stack: e instanceof Error ? e.stack : undefined
        })
      );
    }
  }

  _handleInitialize(params) {
    const protocolVersion =
      typeof params?.protocolVersion === 'string' ? params.protocolVersion : undefined;

    this._client.protocolVersion = protocolVersion;
    this._client.capabilities = params?.capabilities;
    this._client.clientInfo = params?.clientInfo;

    // Negotiate protocol: echo the client's requested version when present.
    // This maximizes compatibility with newer MCP clients (which will reject unknown versions).
    const negotiated =
      typeof protocolVersion === 'string' && protocolVersion.length > 0
        ? protocolVersion
        : this.supportedProtocolVersions[0];

    const result = {
      protocolVersion: negotiated,
      capabilities: this.capabilities,
      serverInfo: this.serverInfo
    };

    if (this.instructions) result.instructions = this.instructions;
    return result;
  }

  _sendResult(id, result) {
    this._enqueueWrite({ jsonrpc: JSONRPC_VERSION, id, result });
  }

  _sendError(id, error) {
    this._enqueueWrite({ jsonrpc: JSONRPC_VERSION, id, error });
  }

  _enqueueWrite(message) {
    // Ensure messages are written sequentially to avoid interleaving.
    this._writeChain = this._writeChain.then(
      () =>
        new Promise(resolve => {
          const payload = JSON.stringify(message) + '\n';
          if (process.stdout.write(payload)) resolve();
          else process.stdout.once('drain', resolve);
        })
    );
  }

  _emitError(error) {
    try {
      if (typeof this.onerror === 'function') this.onerror(error);
    } catch {}
  }

  _handleClose() {
    try {
      if (typeof this.onclose === 'function') this.onclose();
    } catch {}
  }
}
