# Node.js MCP Server Design

## Overview

The Node.js MCP Server acts as a bridge between MCP clients (Claude, Cursor) and the Unity Editor through the Unity Editor MCP package. It uses the official MCP SDK for JavaScript to implement the Model Context Protocol.

## Architecture

```
┌──────────────┐     stdio      ┌─────────────┐     TCP      ┌──────────────┐
│  MCP Client  │◄──────────────▶│ Node.js MCP │◄────────────▶│ Unity Editor │
│              │   JSON-RPC      │   Server    │   Socket     │     MCP      │
└──────────────┘                 └─────────────┘   Port 6400  └──────────────┘
```

## Core Components

### 1. Server Entry Point (`server.js`)
```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { UnityConnection } from './unityConnection.js';
import { registerTools } from './tools/index.js';

const server = new Server({
  name: 'unity-editor-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {}
  }
});

// Initialize Unity connection
const unityConnection = new UnityConnection();

// Register all tools
registerTools(server, unityConnection);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 2. Unity Connection Manager (`unityConnection.js`)

Manages TCP connection to Unity Editor:

```javascript
import net from 'net';
import { EventEmitter } from 'events';

export class UnityConnection extends EventEmitter {
  constructor(host = 'localhost', port = 6400) {
    super();
    this.host = host;
    this.port = port;
    this.socket = null;
    this.connected = false;
    this.commandQueue = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      
      this.socket.connect(this.port, this.host, () => {
        this.connected = true;
        this.emit('connected');
        resolve();
      });

      this.socket.on('data', (data) => {
        this.handleResponse(data);
      });

      this.socket.on('error', (error) => {
        this.connected = false;
        reject(error);
      });
    });
  }

  async sendCommand(type, params) {
    const commandId = crypto.randomUUID();
    const command = { type, params };
    
    return new Promise((resolve, reject) => {
      this.commandQueue.set(commandId, { resolve, reject });
      
      const message = JSON.stringify({ id: commandId, ...command });
      this.socket.write(message);
      
      // Timeout handling
      setTimeout(() => {
        if (this.commandQueue.has(commandId)) {
          this.commandQueue.delete(commandId);
          reject(new Error('Command timeout'));
        }
      }, 30000);
    });
  }
}
```

### 3. Tool Registration System (`tools/index.js`)

```javascript
import { gameObjectTools } from './gameObjectTools.js';
import { sceneTools } from './sceneTools.js';
import { assetTools } from './assetTools.js';
import { scriptTools } from './scriptTools.js';
import { editorTools } from './editorTools.js';

export function registerTools(server, unityConnection) {
  // Register all tool modules
  gameObjectTools(server, unityConnection);
  sceneTools(server, unityConnection);
  assetTools(server, unityConnection);
  scriptTools(server, unityConnection);
  editorTools(server, unityConnection);
}
```

### 4. Tool Implementation Example (`tools/gameObjectTools.js`)

```javascript
export function gameObjectTools(server, unityConnection) {
  server.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: 'create_gameobject',
        description: 'Creates a new GameObject in the Unity scene',
        inputSchema: {
          type: 'object',
          properties: {
            name: { 
              type: 'string',
              description: 'Name of the GameObject'
            },
            primitive: { 
              type: 'string',
              enum: ['cube', 'sphere', 'cylinder', 'capsule', 'plane', 'quad'],
              description: 'Primitive type to create'
            },
            position: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' }
              }
            }
          },
          required: ['name']
        }
      },
      // ... other GameObject tools
    ]
  }));

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'create_gameobject':
        return await createGameObject(unityConnection, args);
      case 'modify_gameobject':
        return await modifyGameObject(unityConnection, args);
      // ... other cases
    }
  });
}

async function createGameObject(unityConnection, args) {
  try {
    const result = await unityConnection.sendCommand('create_gameobject', args);
    return {
      content: [
        {
          type: 'text',
          text: `Created GameObject "${args.name}" successfully`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to create GameObject: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
```

## Connection Management

### Reconnection Strategy
```javascript
class UnityConnection {
  async ensureConnected() {
    if (!this.connected) {
      for (let i = 0; i < 5; i++) {
        try {
          await this.connect();
          return;
        } catch (error) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      throw new Error('Failed to connect to Unity after 5 attempts');
    }
  }
}
```

### Health Checks
```javascript
setInterval(async () => {
  try {
    await unityConnection.sendCommand('ping', {});
  } catch (error) {
    console.error('Unity connection health check failed:', error);
    unityConnection.connected = false;
  }
}, 30000);
```

## Error Handling

### Error Response Format
```javascript
{
  content: [{
    type: 'text',
    text: 'Error: GameObject not found'
  }],
  isError: true
}
```

### Error Categories
1. **Connection Errors**: Unity not running or port blocked
2. **Command Errors**: Invalid parameters or Unity API failures
3. **Timeout Errors**: Command took too long to execute
4. **Protocol Errors**: Invalid JSON or unknown commands

## Configuration

### Environment Variables
```javascript
const config = {
  unityHost: process.env.UNITY_HOST || 'localhost',
  unityPort: parseInt(process.env.UNITY_PORT) || 6400,
  commandTimeout: parseInt(process.env.COMMAND_TIMEOUT) || 30000,
  logLevel: process.env.LOG_LEVEL || 'info'
};
```

### package.json
```json
{
  "name": "unity-editor-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for Unity Editor integration",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "jest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/node": "^20.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Installation & Usage

### For Development
```bash
npm install
npm run dev
```

### For Production
```bash
npm install --production
npm start
```

### MCP Client Configuration
```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "node",
      "args": ["/path/to/unity-editor-mcp-server/server.js"]
    }
  }
}
```

## Testing Strategy

### Unit Tests
- Test individual tool functions
- Mock Unity connection
- Verify parameter validation

### Integration Tests
- Test full command flow
- Use test Unity project
- Verify response formats

### Example Test
```javascript
describe('GameObject Tools', () => {
  let mockConnection;

  beforeEach(() => {
    mockConnection = {
      sendCommand: jest.fn()
    };
  });

  test('create_gameobject sends correct command', async () => {
    mockConnection.sendCommand.mockResolvedValue({ success: true });
    
    const result = await createGameObject(mockConnection, {
      name: 'TestCube',
      primitive: 'cube'
    });

    expect(mockConnection.sendCommand).toHaveBeenCalledWith('create_gameobject', {
      name: 'TestCube',
      primitive: 'cube'
    });
  });
});
```

## Performance Considerations

### Command Batching
Support for sending multiple commands in a single request:
```javascript
server.setRequestHandler('tools/call', async (request) => {
  if (Array.isArray(request.params)) {
    // Batch command execution
    const results = await Promise.all(
      request.params.map(cmd => executeCommand(cmd))
    );
    return results;
  }
  // Single command execution
});
```

### Response Streaming
For large responses (e.g., scene hierarchy):
```javascript
async function* streamHierarchy(unityConnection) {
  const pageSize = 100;
  let offset = 0;
  
  while (true) {
    const page = await unityConnection.sendCommand('get_hierarchy', {
      offset,
      limit: pageSize
    });
    
    if (page.items.length === 0) break;
    
    yield page.items;
    offset += pageSize;
  }
}
```

## Security

- Local connections only (localhost)
- No authentication (development tool)
- Input validation on all parameters
- Path sanitization for file operations

## Future Enhancements

1. **WebSocket Support**: Alternative to TCP for better browser compatibility
2. **Command History**: Store and replay commands
3. **Macro Support**: Record and execute command sequences
4. **Plugin System**: Allow third-party tool additions
5. **Metrics & Monitoring**: Track command usage and performance