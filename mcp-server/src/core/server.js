#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { UnityConnection } from './unityConnection.js';
import { createHandlers } from '../handlers/index.js';
import { config, logger } from './config.js';

// Create Unity connection
const unityConnection = new UnityConnection();

// Create tool handlers
const handlers = createHandlers(unityConnection);

// Create MCP server
const server = new Server(
  {
    name: config.server.name,
    version: config.server.version,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

// Register MCP protocol handlers
// Note: Do not log here as it breaks MCP protocol initialization

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Array.from(handlers.values()).map(handler => handler.getDefinition());
  return { tools };
});

// Handle resources listing
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  logger.debug('[MCP] Received resources/list request');
  // Unity MCP server doesn't provide resources
  return { resources: [] };
});

// Handle prompts listing
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  logger.debug('[MCP] Received prompts/list request');
  // Unity MCP server doesn't provide prompts
  return { prompts: [] };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const requestTime = Date.now();
  
  logger.info(`[MCP] Received tool call request: ${name} at ${new Date(requestTime).toISOString()}`, { args });
  
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
      logger.error(`[MCP] Handler returned error: ${name}`, { error: result.error, code: result.code });
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
      responseText = JSON.stringify({
        status: 'success',
        message: 'Operation completed successfully but no details were returned',
        tool: name
      }, null, 2);
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

unityConnection.on('error', (error) => {
  logger.error('Unity connection error:', error.message);
});

// Initialize server
async function main() {
  try {
    // Create transport - no logging before connection
    const transport = new StdioServerTransport();
    
    // Connect to transport
    await server.connect(transport);
    
    // Now safe to log after connection established
    logger.info('MCP server started successfully');
    
    // Attempt to connect to Unity
    try {
      await unityConnection.connect();
    } catch (error) {
      logger.error('Initial Unity connection failed:', error.message);
      logger.info('Unity connection will retry automatically');
    }
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      unityConnection.disconnect();
      await server.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Shutting down...');
      unityConnection.disconnect();
      await server.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Export for testing
export async function createServer(customConfig = config) {
  const testUnityConnection = new UnityConnection();
  const testHandlers = createHandlers(testUnityConnection);
  
  const testServer = new Server(
    {
      name: customConfig.server.name,
      version: customConfig.server.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    }
  );
  
  // Register handlers for test server
  testServer.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = Array.from(testHandlers.values()).map(handler => handler.getDefinition());
    return { tools };
  });
  
  testServer.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: [] };
  });
  
  testServer.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: [] };
  });
  
  testServer.setRequestHandler(CallToolRequestSchema, async (request) => {
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
main().catch((error) => {
  console.error('Fatal error:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});