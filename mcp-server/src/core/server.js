#!/usr/bin/env node
/**
 * Unity MCP Server - Main Server Module
 *
 * This module implements a deferred initialization pattern to ensure
 * npx compatibility. The MCP transport connection is established FIRST,
 * before loading handlers and other heavy dependencies, to avoid
 * MCP client startup timeouts (NFR: startup <= 10s).
 *
 * Initialization order:
 * 1. Stdio JSON-RPC listener (fast, no heavy deps)
 * 2. Initialization handshake (must complete before timeout)
 * 3. Handler loading (deferred, after connection)
 * 4. Unity connection (deferred, non-blocking)
 */
import fs from 'node:fs';
import { StdioRpcServer } from './stdioRpcServer.js';

// Deferred state - will be initialized after transport connection
let unityConnection = null;
let handlers = null;
let config = null;
let logger = null;
let initializationPromise = null;

let cachedToolManifest = null;
function readToolManifest() {
  if (cachedToolManifest) return cachedToolManifest;
  try {
    const raw = fs.readFileSync(new URL('./toolManifest.json', import.meta.url), 'utf8');
    const parsed = JSON.parse(raw);
    const tools = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.tools)
        ? parsed.tools
        : null;
    if (tools && tools.every(t => t && typeof t === 'object' && typeof t.name === 'string')) {
      cachedToolManifest = tools;
      return tools;
    }
  } catch {}
  return null;
}

/**
 * Lazily load handlers and dependencies
 * Called after MCP transport is connected
 */
async function ensureInitialized() {
  if (handlers !== null) return;
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  initializationPromise = (async () => {
    // Load config first (needed for logging)
    const configModule = await import('./config.js');
    config = configModule.config;
    logger = configModule.logger;

    // Load UnityConnection
    const { UnityConnection } = await import('./unityConnection.js');
    unityConnection = new UnityConnection();

    // Load and create handlers
    const { createHandlers } = await import('../handlers/index.js');
    handlers = createHandlers(unityConnection);

    // Set up Unity connection event handlers
    unityConnection.on('connected', () => {
      logger.info('Unity connection established');
    });

    unityConnection.on('disconnected', () => {
      logger.info('Unity connection lost');
    });

    unityConnection.on('error', error => {
      logger.error('Unity connection error:', error.message);
    });
  })();

  try {
    await initializationPromise;
  } finally {
    initializationPromise = null;
  }
}

// Initialize server
export async function startServer(options = {}) {
  try {
    // Step 1: Load minimal config for server metadata
    // (config import is lightweight; avoid importing the MCP TS SDK on startup)
    const { config: serverConfig, logger: serverLogger } = await import('./config.js');
    config = serverConfig;
    logger = serverLogger;

    const runtimeConfig = {
      ...config,
      http: { ...config.http, ...(options.http || {}) },
      telemetry: { ...config.telemetry, ...(options.telemetry || {}) },
      stdioEnabled: options.stdioEnabled !== undefined ? options.stdioEnabled : true
    };

    // Step 2: Create a lightweight stdio MCP server (no TS SDK import)
    const server =
      runtimeConfig.stdioEnabled === false
        ? null
        : new StdioRpcServer({
            serverInfo: {
              name: config.server.name,
              version: config.server.version
            },
            capabilities: {
              // Advertise tool support with listChanged enabled for future push updates
              tools: { listChanged: true },
              // Enable MCP logging capability for notifications/message
              logging: {}
            }
          });

    let httpServerInstance;

    // Defer expensive background work until after the client has completed
    // initialization and received the initial tool list.
    let mcpInitComplete = runtimeConfig.stdioEnabled === false;
    let postInitRequested = runtimeConfig.stdioEnabled === false;
    let postInitStarted = false;

    const startPostInit = () => {
      if (postInitStarted) return;
      postInitStarted = true;

      // Enable MCP logging notifications (REQ-4) after initialization handshake
      if (runtimeConfig.stdioEnabled !== false) {
        logger.setServer(server);
      }

      // Start loading handlers in background so first request is faster
      ensureInitialized().catch(err => {
        console.error(`[unity-mcp-server] Background initialization failed: ${err.message}`);
      });

      // Optional HTTP transport (requires handlers)
      if (runtimeConfig.http?.enabled) {
        (async () => {
          await ensureInitialized();
          const { createHttpServer } = await import('./httpServer.js');
          httpServerInstance = createHttpServer({
            handlers,
            host: runtimeConfig.http.host,
            port: runtimeConfig.http.port,
            telemetryEnabled: runtimeConfig.telemetry.enabled,
            healthPath: runtimeConfig.http.healthPath,
            allowedHosts: runtimeConfig.http.allowedHosts
          });
          try {
            await httpServerInstance.start();
          } catch (err) {
            logger.error(`HTTP server failed to start: ${err.message}`);
            if (runtimeConfig.stdioEnabled === false) {
              process.exit(1);
            }
          }
        })();
      }

      // Attempt to connect to Unity (deferred, non-blocking)
      (async () => {
        await ensureInitialized();
        console.error(`[unity-mcp-server] Unity connection starting...`);
        try {
          await unityConnection.connect();
          console.error(`[unity-mcp-server] Unity connection established`);
        } catch (error) {
          console.error(`[unity-mcp-server] Unity connection failed: ${error.message}`);
          logger.error('Initial Unity connection failed:', error.message);
          logger.info('Unity connection will retry automatically');
        }
      })();

      // Best-effort: prepare and start persistent C# LSP process (non-blocking)
      (async () => {
        try {
          const { LspProcessManager } = await import('../lsp/LspProcessManager.js');
          const mgr = new LspProcessManager();
          await mgr.ensureStarted();
          // Attach graceful shutdown
          const shutdown = async () => {
            try {
              await mgr.stop(3000);
            } catch {}
          };
          process.on('SIGINT', shutdown);
          process.on('SIGTERM', shutdown);
        } catch (e) {
          logger.warning(`[startup] csharp-lsp start failed: ${e.message}`);
        }
      })();

      // Start periodic index watcher (incremental)
      (async () => {
        await ensureInitialized();
        const { IndexWatcher } = await import('./indexWatcher.js');
        const watcher = new IndexWatcher(unityConnection);
        watcher.start();
        const stopWatch = () => {
          try {
            watcher.stop();
          } catch {}
        };
        process.on('SIGINT', stopWatch);
        process.on('SIGTERM', stopWatch);
      })();

      // Auto-initialize code index if DB doesn't exist
      (async () => {
        await ensureInitialized();
        try {
          const { CodeIndex } = await import('./codeIndex.js');
          const index = new CodeIndex(unityConnection);
          const ready = await index.isReady();

          if (!ready) {
            if (index.disabled) {
              logger.warning(
                `[startup] Code index disabled: ${index.disableReason || 'SQLite native binding missing'}. Skipping auto-build.`
              );
              return;
            }
            logger.info('[startup] Code index DB not ready. Starting auto-build...');
            const { CodeIndexBuildToolHandler } =
              await import('../handlers/script/CodeIndexBuildToolHandler.js');
            const builder = new CodeIndexBuildToolHandler(unityConnection);
            const result = await builder.execute({});

            if (result.success) {
              logger.info(
                `[startup] Code index auto-build started: jobId=${result.jobId}. Use code_index_status to check progress.`
              );
            } else {
              logger.warning(`[startup] Code index auto-build failed: ${result.message}`);
            }
          } else {
            logger.info('[startup] Code index DB already exists. Skipping auto-build.');
          }
        } catch (e) {
          logger.warning(`[startup] Code index auto-init failed: ${e.message}`);
        }
      })();
    };

    const requestPostInit = () => {
      postInitRequested = true;
      if (mcpInitComplete) {
        setImmediate(startPostInit);
      }
    };

    // For stdio MCP, wait for notifications/initialized AND the initial tools/list
    // to avoid blocking startup tool discovery in clients with short timeouts.
    if (server) {
      server.oninitialized = () => {
        mcpInitComplete = true;
        if (postInitRequested) {
          setImmediate(startPostInit);
        }
      };
    }

    // Step 3: Register request handlers (they will lazily load dependencies)
    // Handle logging/setLevel request (REQ-6)
    server?.setRequestHandler('logging/setLevel', async request => {
      const { level } = request.params || {};
      logger.setLevel(level);
      logger.info(`Log level changed to: ${level}`);
      return {};
    });

    // Handle tool listing
    server?.setRequestHandler('tools/list', async () => {
      const manifestTools = readToolManifest();
      if (manifestTools) {
        logger.info(`[MCP] Returning ${manifestTools.length} tool definitions`);
        requestPostInit();
        return { tools: manifestTools };
      }

      await ensureInitialized();

      const tools = Array.from(handlers.values())
        .map((handler, index) => {
          try {
            const definition = handler.getDefinition();
            // Validate inputSchema
            if (definition.inputSchema && definition.inputSchema.type !== 'object') {
              logger.error(
                `[MCP] Tool ${handler.name} (index ${index}) has invalid inputSchema type: ${definition.inputSchema.type}`
              );
            }
            return definition;
          } catch (error) {
            logger.error(`[MCP] Failed to get definition for handler ${handler.name}:`, error);
            return null;
          }
        })
        .filter(tool => tool !== null);

      logger.info(`[MCP] Returning ${tools.length} tool definitions`);
      requestPostInit();
      return { tools };
    });

    // Handle tool execution
    server?.setRequestHandler('tools/call', async request => {
      await ensureInitialized();

      const { name, arguments: args } = request.params || {};
      const requestTime = Date.now();

      logger.info(
        `[MCP] Received tool call request: ${name} at ${new Date(requestTime).toISOString()}`,
        { args }
      );

      const handler = handlers.get(name);
      if (!handler) {
        logger.error(`[MCP] Tool not found: ${name}`);
        throw new Error(`Tool not found: ${name}`);
      }

      try {
        logger.info(`[MCP] Starting handler execution for: ${name} at ${new Date().toISOString()}`);
        const startTime = Date.now();

        // Handler returns response in our format
        const result = await handler.handle(args);

        const duration = Date.now() - startTime;
        const totalDuration = Date.now() - requestTime;
        logger.info(`[MCP] Handler completed at ${new Date().toISOString()}: ${name}`, {
          handlerDuration: `${duration}ms`,
          totalDuration: `${totalDuration}ms`,
          status: result.status
        });

        // Convert to MCP format
        if (result.status === 'error') {
          logger.error(`[MCP] Handler returned error: ${name}`, {
            error: result.error,
            code: result.code
          });
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${result.error}\nCode: ${result.code || 'UNKNOWN_ERROR'}${result.details ? '\nDetails: ' + JSON.stringify(result.details, null, 2) : ''}`
              }
            ]
          };
        }

        // Success response
        logger.info(`[MCP] Returning success response for: ${name} at ${new Date().toISOString()}`);

        // Handle undefined or null results from handlers
        let responseText;
        if (result.result === undefined || result.result === null) {
          responseText = JSON.stringify(
            {
              status: 'success',
              message: 'Operation completed successfully but no details were returned',
              tool: name
            },
            null,
            2
          );
        } else {
          responseText = JSON.stringify(result.result, null, 2);
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText
            }
          ]
        };
      } catch (error) {
        const errorTime = Date.now();
        logger.error(
          `[MCP] Handler threw exception at ${new Date(errorTime).toISOString()}: ${name}`,
          {
            error: error.message,
            stack: error.stack,
            duration: `${errorTime - requestTime}ms`
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });

    // Step 4: Start stdio listener (critical for short client timeouts)
    if (server) {
      console.error(`[unity-mcp-server] MCP transport connecting...`);
      await server.start();
      console.error(`[unity-mcp-server] MCP transport connected`);
    }

    // Now safe to log after connection established
    logger.info('MCP server started successfully');

    // In HTTP-only mode (--no-stdio), there is no MCP tools/list handshake.
    // Start background work immediately so the HTTP server can come up.
    if (runtimeConfig.stdioEnabled === false) {
      startPostInit();
    }

    // Handle shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      if (unityConnection) unityConnection.disconnect();
      if (server) await server.close();
      if (httpServerInstance) await httpServerInstance.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down...');
      if (unityConnection) unityConnection.disconnect();
      if (server) await server.close();
      if (httpServerInstance) await httpServerInstance.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Maintain backwards compatibility for older callers that expect main()
export const main = startServer;

// Export for testing
export async function createServer(customConfig) {
  // For testing, keep using the official MCP SDK to validate compatibility.
  const [{ config: defaultConfig }, sdkServerModule, sdkTypesModule] = await Promise.all([
    import('./config.js'),
    import('@modelcontextprotocol/sdk/server/index.js'),
    import('@modelcontextprotocol/sdk/types.js')
  ]);

  const actualConfig = customConfig || defaultConfig;
  const { Server } = sdkServerModule;
  const { ListToolsRequestSchema, CallToolRequestSchema } = sdkTypesModule;

  const { UnityConnection } = await import('./unityConnection.js');
  const { createHandlers } = await import('../handlers/index.js');

  const testUnityConnection = new UnityConnection();
  const testHandlers = createHandlers(testUnityConnection);

  const testServer = new Server(
    {
      name: actualConfig.server.name,
      version: actualConfig.server.version
    },
    {
      capabilities: {
        tools: { listChanged: true }
      }
    }
  );

  // Register handlers for test server
  testServer.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = Array.from(testHandlers.values()).map(handler => handler.getDefinition());
    return { tools };
  });

  testServer.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;

    const handler = testHandlers.get(name);
    if (!handler) {
      return {
        status: 'error',
        error: `Tool not found: ${name}`,
        code: 'TOOL_NOT_FOUND'
      };
    }

    return await handler.handle(args);
  });

  return {
    server: testServer,
    unityConnection: testUnityConnection
  };
}

// Start the server
const isDirectExecution = (() => {
  if (process.env.NODE_ENV === 'test') return false;
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === new URL('file://' + process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isDirectExecution) {
  startServer().catch(error => {
    console.error('Fatal error:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  });
}
