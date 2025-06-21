import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { UnityConnection } from './unityConnection.js';
import { createHandlers } from './handlers/index.js';
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
      tools: {}
    }
  }
);

// Register MCP protocol handlers
logger.info('Registering tools...');

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Array.from(handlers.values()).map(handler => handler.getDefinition());
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  const handler = handlers.get(name);
  if (!handler) {
    return {
      status: 'error',
      error: `Tool not found: ${name}`,
      code: 'TOOL_NOT_FOUND'
    };
  }
  
  // Handler returns response in new format
  return await handler.handle(args);
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
    logger.info('Starting Unity Editor MCP Server...');
    
    // Create transport
    const transport = new StdioServerTransport();
    
    // Connect to transport
    await server.connect(transport);
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
    logger.error('Failed to start server:', error);
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
        tools: {}
      }
    }
  );
  
  // Register handlers for test server
  testServer.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = Array.from(testHandlers.values()).map(handler => handler.getDefinition());
    return { tools };
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

// Start the server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}