import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { UnityConnection } from './unityConnection.js';
import { registerPingTool } from './tools/ping.js';
import { config, logger } from './config.js';

// Create Unity connection
const unityConnection = new UnityConnection();

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

// Register tools
logger.info('Registering tools...');
registerPingTool(server, unityConnection);

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
  
  registerPingTool(testServer, testUnityConnection);
  
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