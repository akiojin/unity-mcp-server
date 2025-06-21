# Unity Editor MCP - Setup Guide

This guide will help you set up and run the Unity Editor MCP (Model Context Protocol) integration.

## Prerequisites

- Unity 2020.3 LTS or later
- Node.js 18+ and npm
- A Claude Desktop or MCP-compatible client

## Installation

### Step 1: Unity Package Setup

1. Copy the `unity-editor-mcp` folder into your Unity project's `Packages` directory
2. Open Unity and wait for it to compile
3. The package will automatically start a TCP server on port 6400 when Unity loads

### Step 2: Node.js Server Setup

1. Navigate to the `mcp-server` directory:
   ```bash
   cd mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the MCP server:
   ```bash
   npm start
   ```

## Configuration

### Unity Configuration

The Unity package uses these default settings:
- TCP Port: 6400
- Host: localhost

Currently, these are hardcoded but will be configurable in future phases.

### Node.js Configuration

The MCP server configuration is in `mcp-server/src/config.js`:

```javascript
export const config = {
  unity: {
    host: 'localhost',
    port: 6400,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    commandTimeout: 5000
  },
  server: {
    name: 'unity-editor-mcp-server',
    version: '0.1.0'
  }
};
```

## Running the System

### Start Order

1. **Start Unity First**: Open your Unity project. The TCP server will start automatically.
2. **Start Node.js Server**: Run `npm start` in the `mcp-server` directory
3. **Connect Your MCP Client**: Configure your client to connect to the Node.js server

### Verifying Connection

When everything is connected properly, you'll see:

In Unity Console:
```
[Unity Editor MCP] Initializing...
[Unity Editor MCP] TCP listener started on port 6400
[Unity Editor MCP] Status changed to: Disconnected
[Unity Editor MCP] Client connected
[Unity Editor MCP] Status changed to: Connected
```

In Node.js Terminal:
```
[Unity Editor MCP] Starting Unity Editor MCP Server...
[Unity Editor MCP] Registering tools...
[Unity Editor MCP] MCP server started successfully
[Unity Editor MCP] Connecting to Unity at localhost:6400...
[Unity Editor MCP] Connected to Unity Editor
```

## Testing the Connection

### Using the Ping Tool

The ping tool is available to test the connection:

1. In your MCP client, list available tools
2. You should see a `ping` tool with description "Test connection to Unity Editor"
3. Call the ping tool with an optional message:
   ```json
   {
     "tool": "ping",
     "arguments": {
       "message": "Hello Unity!"
     }
   }
   ```
4. You should receive a response like:
   ```
   Unity responded: pong (echo: Hello Unity!)
   ```

## Troubleshooting

### Unity TCP Server Not Starting

- Check Unity Console for error messages
- Ensure no other application is using port 6400
- Try restarting Unity

### Node.js Cannot Connect to Unity

- Verify Unity is running and the TCP server is active
- Check firewall settings allow local TCP connections
- Look for connection errors in the Node.js console

### Connection Drops Frequently

The system includes automatic reconnection:
- Node.js will attempt to reconnect with exponential backoff
- Maximum retry delay is 30 seconds
- Check network stability and Unity performance

### Commands Timeout

- Default command timeout is 5 seconds
- Check if Unity is processing commands (not frozen)
- Look for errors in Unity Console

## Development Setup

### Running Tests

Unity Tests:
1. Open Unity Test Runner (Window > General > Test Runner)
2. Select "EditMode" tests
3. Run all tests in the UnityEditorMCP assembly

Node.js Tests:
```bash
cd mcp-server
npm test
```

### Debug Logging

Enable debug logs by setting the log level:
```javascript
// In mcp-server/src/config.js
logLevel: 'debug'  // Change from 'info' to 'debug'
```

## Architecture Overview

```
┌─────────────────┐     TCP      ┌──────────────────┐     MCP      ┌─────────────┐
│                 │   Port 6400   │                  │   Protocol    │             │
│   Unity Editor  │◄─────────────►│  Node.js Server  │◄─────────────►│ MCP Client  │
│   (TCP Server)  │               │  (MCP Server)    │               │  (Claude)   │
│                 │               │                  │               │             │
└─────────────────┘               └──────────────────┘               └─────────────┘
```

1. Unity runs a TCP server that accepts JSON commands
2. Node.js server connects to Unity and exposes MCP tools
3. MCP clients can call tools to interact with Unity

## Next Steps

- Explore Phase 2 features (Scene manipulation)
- Contribute to the project
- Report issues on GitHub

## Support

For issues or questions:
- Check the [Technical Specification](technical-specification.md)
- Review the [Development Roadmap](development-roadmap.md)
- Open an issue on the project repository