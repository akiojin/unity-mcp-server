import http from 'node:http';
import { logger } from './config.js';

function buildHealthResponse({ startedAt, mode, port, telemetryEnabled }) {
  return {
    status: 'ok',
    mode,
    port,
    telemetryEnabled,
    uptimeMs: Date.now() - startedAt
  };
}

function suggestPorts(port) {
  if (!port || typeof port !== 'number') return [];
  return [port + 1, port + 2, port + 11];
}

export function createHttpServer({
  handlers,
  host = '0.0.0.0',
  port = 6401,
  telemetryEnabled = false,
  healthPath = '/healthz',
  allowedHosts = ['localhost', '127.0.0.1']
} = {}) {
  const startedAt = Date.now();
  let server;

  const listener = async (req, res) => {
    try {
      const hostHeader = req.headers.host?.split(':')[0];
      if (allowedHosts && allowedHosts.length && hostHeader && !allowedHosts.includes(hostHeader)) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'forbidden host' }));
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      if (req.method === 'GET' && url.pathname === healthPath) {
        const body = buildHealthResponse({
          startedAt,
          mode: 'http',
          port: server?.address()?.port,
          telemetryEnabled
        });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(body));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/rpc') {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString('utf8');
        let payload;
        try {
          payload = JSON.parse(raw || '{}');
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Invalid JSON' } })
          );
          return;
        }

        const { method, params, id } = payload || {};
        if (method === 'tools/list' || method === 'listTools') {
          const tools = Array.from(handlers.values()).map(h => h.getDefinition());
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id, result: { tools } }));
          return;
        }

        if (method === 'tools/call' || method === 'callTool') {
          const name = params?.name;
          const args = params?.arguments || {};
          const handler = handlers.get(name);
          if (!handler) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(
              JSON.stringify({
                jsonrpc: '2.0',
                id,
                error: { code: -32004, message: `Tool not found: ${name}` }
              })
            );
            return;
          }
          try {
            const result = await handler.handle(args);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ jsonrpc: '2.0', id, result }));
          } catch (e) {
            logger.error(`[http] tool error ${name}: ${e.message}`);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(
              JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, message: e.message } })
            );
          }
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: 'Method not found' }
          })
        );
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (e) {
      logger.error(`[http] unexpected error: ${e.message}`);
      try {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'internal error' }));
      } catch {}
    }
  };

  server = http.createServer(listener);

  const start = () =>
    new Promise((resolve, reject) => {
      const onError = err => {
        server.off('error', onError);
        if (err.code === 'EADDRINUSE') {
          const suggestions = suggestPorts(port);
          const msg = `Port ${port} is already in use. Try: ${suggestions.join(', ')}`;
          logger.error(msg);
        }
        reject(err);
      };
      server.once('error', onError);
      server.listen(port, host, () => {
        server.off('error', onError);
        const address = server.address();
        logger.info(
          `HTTP listening on http://${host}:${address.port}, telemetry: ${telemetryEnabled ? 'on' : 'off'}`
        );
        resolve(address.port);
      });
    });

  const close = () =>
    new Promise((resolve, reject) => {
      server.close(err => {
        if (err) reject(err);
        else resolve();
      });
    });

  return {
    start,
    close,
    getPort: () => server.address()?.port,
    health: () =>
      buildHealthResponse({
        startedAt,
        mode: 'http',
        port: server.address()?.port,
        telemetryEnabled
      })
  };
}
