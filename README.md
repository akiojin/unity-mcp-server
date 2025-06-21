# Unity Editor MCP

Unity Editor MCP (Model Context Protocol) enables AI assistants like Claude and Cursor to interact directly with the Unity Editor, allowing for AI-assisted game development and automation.

## Project Structure

```
unity-mcp/
├── unity-editor-mcp/      # Unity package
│   ├── package.json
│   └── Editor/
│       ├── Core/          # Main TCP server and command processing
│       ├── Models/        # Data models (Command, McpStatus)
│       └── Helpers/       # Utility classes (Response)
├── mcp-server/            # Node.js MCP server
│   ├── package.json
│   └── src/
│       ├── server.js      # Main server entry point
│       ├── unityConnection.js  # TCP client for Unity
│       ├── config.js      # Configuration
│       └── tools/         # MCP tool implementations
└── docs/                  # Documentation
```

## Quick Start

### Prerequisites

- Unity 2020.3 LTS or newer
- Node.js 18.0.0 or newer
- npm or yarn
- An MCP client (Claude Desktop or Cursor)

### Installation

#### 1. Install the Unity Package

1. Open your Unity project
2. Open the Package Manager (Window > Package Manager)
3. Click the "+" button and select "Add package from disk..."
4. Navigate to `unity-editor-mcp/package.json` and select it
5. Unity will import the package and start the TCP listener automatically

#### 2. Install the Node.js Server

```bash
cd mcp-server
npm install
```

#### 3. Configure Your MCP Client

For **Claude Desktop**, add to your configuration file:

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "unity-editor-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/unity-mcp/mcp-server/src/server.js"]
    }
  }
}
```

For **Cursor**, check their documentation for MCP configuration.

### Testing the Connection

1. Make sure Unity Editor is running with the package installed
2. Start your MCP client (Claude or Cursor)
3. The Unity console should show: `[Unity Editor MCP] Client connected`
4. In your MCP client, you should see the `ping` tool available
5. Try running the ping command to verify the connection

## Available Tools

Currently implemented:
- `ping` - Test connection to Unity Editor

Coming soon:
- `create_gameobject` - Create GameObjects in the scene
- `modify_transform` - Modify GameObject transforms
- `manage_scene` - Scene management operations
- `manage_assets` - Asset creation and management
- And many more...

## Development Status

This project is currently in Phase 1 (Foundation) of development. See the [progression document](docs/progression.md) for detailed status.

### Current Features
- ✅ Unity TCP server on port 6400
- ✅ Node.js MCP server with stdio transport
- ✅ Basic command routing infrastructure
- ✅ Ping/pong connectivity test
- ✅ Automatic reconnection logic

### In Progress
- 🚧 Integration testing
- 🚧 Error handling improvements
- 🚧 Documentation

## Troubleshooting

### Unity TCP Listener Issues

If you see "Port 6400 is already in use":
1. Check if another Unity instance is running
2. Close all Unity instances and restart
3. If the issue persists, you may have another process using port 6400

### Connection Failed

1. Ensure Unity Editor is running with the package installed
2. Check the Unity console for error messages
3. Verify the Node.js server is running
4. Check your MCP client configuration path is absolute

### Node.js Server Won't Start

1. Ensure you have Node.js 18+ installed: `node --version`
2. Run `npm install` in the mcp-server directory
3. Check for any error messages in the console

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Documentation

- [Implementation Plan](docs/implementation-plan.md)
- [Technical Specification](docs/technical-specification.md)
- [Development Roadmap](docs/development-roadmap.md)
- [Phase 1 Planning](docs/phase-1-planning.md)
- [Current Progress](docs/progression.md)