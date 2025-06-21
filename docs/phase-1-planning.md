# Phase 1: Foundation - Detailed Planning

## Overview
This document provides detailed planning for Phase 1 of Unity Editor MCP development. The foundation phase establishes the core communication infrastructure between Unity Editor and the Node.js MCP server.

## Goals
- Establish TCP communication between Unity and Node.js
- Implement basic command routing infrastructure
- Create foundational helper classes
- Verify end-to-end connectivity with ping/pong

## Architecture for Phase 1

```
Unity Editor                           Node.js Server
┌─────────────────────┐               ┌─────────────────────┐
│ UnityEditorMCP.cs   │               │ server.js           │
│ ┌─────────────────┐ │               │ ┌─────────────────┐ │
│ │ TCP Listener    │ │◄─────TCP─────▶│ │ TCP Client      │ │
│ │ Port: 6400      │ │   Socket      │ │ Connection Mgr  │ │
│ └─────────────────┘ │               │ └─────────────────┘ │
│ ┌─────────────────┐ │               │ ┌─────────────────┐ │
│ │ Command Queue   │ │               │ │ MCP Server      │ │
│ │ JSON Parser     │ │               │ │ Tool Registry   │ │
│ └─────────────────┘ │               │ └─────────────────┘ │
└─────────────────────┘               └─────────────────────┘
```

## Implementation Details

### Unity Editor MCP Package

#### 1. Package Structure
```
unity-editor-mcp/
├── package.json
├── package.json.meta
├── Editor/
│   ├── Editor.asmdef
│   ├── Editor.asmdef.meta
│   ├── Core/
│   │   ├── UnityEditorMCP.cs
│   │   ├── UnityEditorMCP.cs.meta
│   │   ├── CommandProcessor.cs
│   │   └── CommandProcessor.cs.meta
│   ├── Models/
│   │   ├── Command.cs
│   │   ├── Command.cs.meta
│   │   ├── McpStatus.cs
│   │   └── McpStatus.cs.meta
│   └── Helpers/
│       ├── Response.cs
│       ├── Response.cs.meta
│       ├── JsonHelper.cs
│       └── JsonHelper.cs.meta
```

#### 2. Core Classes

**UnityEditorMCP.cs**
```csharp
[InitializeOnLoad]
public static class UnityEditorMCP
{
    private static TcpListener tcpListener;
    private static bool isRunning;
    private static readonly Queue<Command> commandQueue = new Queue<Command>();
    private static McpStatus status = McpStatus.NotConfigured;
    
    static UnityEditorMCP()
    {
        EditorApplication.update += ProcessCommandQueue;
        StartTcpListener();
    }
    
    private static void StartTcpListener()
    {
        // Implementation
    }
    
    private static void ProcessCommandQueue()
    {
        // Process commands on main thread
    }
}
```

**Command.cs**
```csharp
[Serializable]
public class Command
{
    public string id;
    public string type;
    public JObject parameters;
}
```

**McpStatus.cs**
```csharp
public enum McpStatus
{
    NotConfigured,
    Disconnected,
    Connecting,
    Connected,
    Error
}
```

**Response.cs**
```csharp
public static class Response
{
    public static string Success(object data = null)
    {
        return JsonConvert.SerializeObject(new {
            status = "success",
            data = data
        });
    }
    
    public static string Error(string message, string code = null)
    {
        return JsonConvert.SerializeObject(new {
            status = "error",
            error = message,
            code = code
        });
    }
}
```

### Node.js MCP Server

#### 1. Project Structure
```
mcp-server/
├── package.json
├── src/
│   ├── server.js
│   ├── unityConnection.js
│   ├── config.js
│   └── tools/
│       └── ping.js
```

#### 2. Core Implementation

**package.json**
```json
{
  "name": "unity-editor-mcp-server",
  "version": "0.1.0",
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0"
  }
}
```

**server.js**
```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { UnityConnection } from './unityConnection.js';
import { registerPingTool } from './tools/ping.js';

const server = new Server({
  name: 'unity-editor-mcp',
  version: '0.1.0'
}, {
  capabilities: {
    tools: {}
  }
});

const unityConnection = new UnityConnection();

// Register tools
registerPingTool(server, unityConnection);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

**unityConnection.js**
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
  }

  async connect() {
    // TCP connection implementation
  }

  async sendCommand(type, params = {}) {
    // Send command and wait for response
  }
}
```

## Testing Plan

### 1. Unit Tests

**Unity Tests**
- Command parsing
- Response formatting
- Queue operations

**Node.js Tests**
- Connection management
- Tool registration
- Error handling

### 2. Integration Tests

**Test Scenarios**
1. Start Unity with package → Start Node.js server → Verify connection
2. Send ping from Node.js → Receive pong from Unity
3. Disconnect and reconnect scenarios
4. Error handling for malformed commands

### 3. Manual Testing Checklist
- [ ] Unity package loads without errors
- [ ] TCP listener starts on correct port
- [ ] Node.js server starts successfully
- [ ] Ping command works both ways
- [ ] Proper error messages for connection failures
- [ ] Clean shutdown on both sides

## Success Criteria

1. **Connection Establishment**
   - Unity TCP listener active on port 6400
   - Node.js client can connect
   - Status shows "Connected"

2. **Command Flow**
   - Ping command sent from Node.js
   - Unity processes on main thread
   - Pong response received
   - Round trip < 50ms

3. **Error Handling**
   - Graceful handling of connection loss
   - Clear error messages
   - Automatic reconnection attempts

4. **Code Quality**
   - All classes documented
   - Error handling in place
   - Logging for debugging

## Common Issues & Solutions

### Issue: Port 6400 Already in Use
**Solution**: 
- Check for other Unity instances
- Add port configuration option
- Implement port scanning fallback

### Issue: Unity Freezes on Command
**Solution**:
- Ensure async TCP operations
- Process commands in queue
- Add timeout handling

### Issue: Connection Drops Frequently
**Solution**:
- Implement keep-alive
- Add reconnection logic
- Better error recovery

## Phase 1 Deliverables

1. **Unity Package**
   - Basic package structure
   - TCP listener implementation
   - Command processing system
   - Helper classes (Response, Status)

2. **Node.js Server**
   - MCP server setup
   - Unity connection manager
   - Ping tool implementation
   - Basic error handling

3. **Documentation**
   - Setup instructions
   - API documentation for ping
   - Troubleshooting guide

4. **Tests**
   - Basic test suite
   - Manual test results
   - Performance baseline

## Next Phase Preparation

After completing Phase 1:
1. Review architecture for scalability
2. Document any design changes
3. Create templates for new tools
4. Plan GameObject operations structure

## Time Allocation (3 Days)

### Day 1: Unity Package
- Morning: Package setup and structure
- Afternoon: TCP listener implementation
- Evening: Command queue and processing

### Day 2: Node.js Server
- Morning: Project setup and MCP integration
- Afternoon: Unity connection implementation
- Evening: Ping tool and testing

### Day 3: Integration & Testing
- Morning: End-to-end testing
- Afternoon: Bug fixes and improvements
- Evening: Documentation and cleanup