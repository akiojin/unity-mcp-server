#!/usr/bin/env node
/**
 * Unity MCP Server - Main Server Module
 *
 * This module implements a deferred initialization pattern to ensure
 * npx compatibility. The MCP transport connection is established FIRST,
 * before loading handlers and other heavy dependencies, to avoid
 * Claude Code's 30-second timeout.
 *
 * Initialization order:
 * 1. MCP SDK imports (minimal, fast)
 * 2. Transport connection (must complete before timeout)
 * 3. Handler loading (deferred, after connection)
 * 4. Unity connection (deferred, non-blocking)
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  SetLevelRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Deferred state - will be initialized after transport connection
let unityConnection = null;
let handlers = null;
let config = null;
let logger = null;

/**
 * Lazily load handlers and dependencies
 * Called after MCP transport is connected
 */
async function ensureInitialized() {
  if (handlers !== null) return;

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
}

// Initialize server
export async function startServer(options = {}) {
  try {
    // Step 1: Load minimal config for server metadata
    // We need server name/version before creating the Server instance
    const { config: serverConfig, logger: serverLogger } = await import('./config.js');
    config = serverConfig;
    logger = serverLogger;

    const runtimeConfig = {
      ...config,
      http: { ...config.http, ...(options.http || {}) },
      telemetry: { ...config.telemetry, ...(options.telemetry || {}) },
      stdioEnabled: options.stdioEnabled !== undefined ? options.stdioEnabled : true
    };

    // Step 2: Create MCP server with minimal configuration
    const server = new Server(
      {
        name: config.server.name,
        version: config.server.version
      },
      {
        capabilities: {
          // Explicitly advertise tool support; some MCP clients expect a non-empty object
          // Setting listChanged enables future push updates if we emit notifications
          tools: { listChanged: true },
          // Enable MCP logging capability for sendLoggingMessage
          logging: {}
        }
      }
    );

    // Step 3: Connect transport FIRST (critical for npx timeout avoidance)
    let transport;
    if (runtimeConfig.stdioEnabled !== false) {
      console.error(`[unity-mcp-server] MCP transport connecting...`);
      transport = new StdioServerTransport();
      await server.connect(transport);
      console.error(`[unity-mcp-server] MCP transport connected`);
    }

    // Step 4: Register request handlers (they will lazily load dependencies)
    // Handle logging/setLevel request (REQ-6)
    server.setRequestHandler(SetLevelRequestSchema, async request => {
      await ensureInitialized();
      const { level } = request.params;
      logger.setLevel(level);
      logger.info(`Log level changed to: ${level}`);
      return {};
    });

    // Handle tool listing
    server.setRequestHandler(ListToolsRequestSchema, async () => {
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
      return { tools };
    });

    // Handle tool execution
    server.setRequestHandler(CallToolRequestSchema, async request => {
      await ensureInitialized();

      const { name, arguments: args } = request.params;
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

    // Now safe to log after connection established
    logger.info('MCP server started successfully');

    let httpServerInstance;

    // Step 5: Background initialization (deferred)
    // NOTE: We intentionally wait until MCP initialization completes before starting
    // heavy module imports (handlers, code index, etc.). Even if launched in a
    // "fire-and-forget" async task, ESM module loading is CPU-heavy and can block
    // the event loop, delaying the client's `initialize` handshake and causing
    // startup timeouts in some MCP hosts.
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

    // When stdio is enabled, wait until MCP client finishes initialization.
    // In HTTP-only mode (--no-stdio), there is no MCP init flow, so start immediately.
    if (runtimeConfig.stdioEnabled !== false) {
      server.oninitialized = () => startPostInit();
    } else {
      startPostInit();
    }

    // Handle shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      if (unityConnection) unityConnection.disconnect();
      if (transport) await server.close();
      if (httpServerInstance) await httpServerInstance.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down...');
      if (unityConnection) unityConnection.disconnect();
      if (transport) await server.close();
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
  // For testing, we need to load dependencies synchronously
  const { config: defaultConfig } = await import('./config.js');
  const actualConfig = customConfig || defaultConfig;

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
