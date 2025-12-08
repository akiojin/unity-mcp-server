#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  SetLevelRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
// Note: filename is lowercase on disk; use exact casing for POSIX filesystems
import { UnityConnection } from './unityConnection.js';
import { createHandlers } from '../handlers/index.js';
import { config, logger } from './config.js';
import { IndexWatcher } from './indexWatcher.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Create Unity connection
const unityConnection = new UnityConnection();

// Create tool handlers
const handlers = createHandlers(unityConnection);

// Create MCP server
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

// Register MCP protocol handlers
// Note: Do not log here as it breaks MCP protocol initialization

// Handle logging/setLevel request (REQ-6)
server.setRequestHandler(SetLevelRequestSchema, async request => {
  const { level } = request.params;
  logger.setLevel(level);
  logger.info(`Log level changed to: ${level}`);
  return {};
});

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
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
    logger.error(`[MCP] Handler threw exception at ${new Date(errorTime).toISOString()}: ${name}`, {
      error: error.message,
      stack: error.stack,
      duration: `${errorTime - requestTime}ms`
    });
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

// Handle connection events
unityConnection.on('connected', () => {
  logger.info('Unity connection established');
});

unityConnection.on('disconnected', () => {
  logger.info('Unity connection lost');
});

unityConnection.on('error', error => {
  logger.error('Unity connection error:', error.message);
});

// Initialize server
export async function startServer(options = {}) {
  try {
    const runtimeConfig = {
      ...config,
      http: { ...config.http, ...(options.http || {}) },
      telemetry: { ...config.telemetry, ...(options.telemetry || {}) },
      stdioEnabled: options.stdioEnabled !== undefined ? options.stdioEnabled : true
    };

    // Create transport - no logging before connection
    let transport;
    if (runtimeConfig.stdioEnabled !== false) {
      console.error(`[unity-mcp-server] MCP transport connecting...`);
      transport = new StdioServerTransport();
      await server.connect(transport);
      console.error(`[unity-mcp-server] MCP transport connected`);

      // Enable MCP logging notifications (REQ-4)
      logger.setServer(server);
    }

    // Now safe to log after connection established
    logger.info('MCP server started successfully');

    // Optional HTTP transport
    let httpServerInstance;
    if (runtimeConfig.http?.enabled) {
      const { createHttpServer } = await import('./httpServer.js');
      httpServerInstance = createHttpServer({
        handlers,
        host: runtimeConfig.http.host,
        port: runtimeConfig.http.port,
        telemetryEnabled: runtimeConfig.telemetry.enabled,
        healthPath: runtimeConfig.http.healthPath
      });
      try {
        await httpServerInstance.start();
      } catch (err) {
        logger.error(`HTTP server failed to start: ${err.message}`);
        throw err;
      }
    }

    // Attempt to connect to Unity
    console.error(`[unity-mcp-server] Unity connection starting...`);
    try {
      await unityConnection.connect();
      console.error(`[unity-mcp-server] Unity connection established`);
    } catch (error) {
      console.error(`[unity-mcp-server] Unity connection failed: ${error.message}`);
      logger.error('Initial Unity connection failed:', error.message);
      logger.info('Unity connection will retry automatically');
    }

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
    const watcher = new IndexWatcher(unityConnection);
    watcher.start();
    const stopWatch = () => {
      try {
        watcher.stop();
      } catch {}
    };
    process.on('SIGINT', stopWatch);
    process.on('SIGTERM', stopWatch);

    // Auto-initialize code index if DB doesn't exist
    (async () => {
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
          const { CodeIndexBuildToolHandler } = await import(
            '../handlers/script/CodeIndexBuildToolHandler.js'
          );
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

    // Handle shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      unityConnection.disconnect();
      if (transport) await server.close();
      if (httpServerInstance) await httpServerInstance.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down...');
      unityConnection.disconnect();
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
export async function createServer(customConfig = config) {
  const testUnityConnection = new UnityConnection();
  const testHandlers = createHandlers(testUnityConnection);

  const testServer = new Server(
    {
      name: customConfig.server.name,
      version: customConfig.server.version
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
