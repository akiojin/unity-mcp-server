import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Ping tool for testing Unity connection
 */
export function registerPingTool(server, unityConnection) {
  // Tool definition
  const pingTool = {
    name: 'system_ping',
    description: 'Test connection to Unity Editor',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Optional message to echo back'
        }
      },
      required: []
    }
  };
  
  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [pingTool]
    };
  });
  
  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    if (name === 'system_ping') {
      try {
        // Ensure connected
        if (!unityConnection.isConnected()) {
          await unityConnection.connect();
        }
        
        // Send ping with optional message
        const result = await unityConnection.sendCommand('system_ping', {
          message: args?.message || 'system_ping'
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Unity responded: ${result.message} (echo: ${result.echo || args?.message || 'system_ping'})`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to ping Unity: ${error.message}`
            }
          ],
          isError: true
        };
      }
    }
    
    throw new Error(`Tool not found: ${name}`);
  });
}