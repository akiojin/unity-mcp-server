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
- An MCP client (Claude Desktop or Cursor)

### Installation

#### 1. Install the Unity Package

**Option A: From GitHub (Recommended)**
1. Open your Unity project
2. Open the Package Manager (Window > Package Manager)
3. Click the "+" button and select "Add package from git URL..."
4. Enter the following URL:
   ```
   https://github.com/ozankasikci/unity-editor-mcp.git?path=unity-editor-mcp
   ```
5. Unity will download and import the package automatically

**Option B: From Local Files**
1. Clone or download this repository to your local machine
2. Open your Unity project
3. Open the Package Manager (Window > Package Manager)
4. Click the "+" button and select "Add package from disk..."
5. Navigate to `unity-editor-mcp/package.json` and select it
6. Unity will import the package and start the TCP listener automatically

**Note**: The Unity package will automatically start the TCP listener on port 6402 when imported.

#### 2. Configure Your MCP Client

For **Claude Desktop**, add to your configuration file:

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "unity-editor-mcp": {
      "command": "npx",
      "args": ["unity-editor-mcp"]
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

Unity Editor MCP provides **23 comprehensive tools** across 6 categories for complete Unity Editor automation:

### System & Core Tools (3 tools)
- **`ping`** - Test connection to Unity Editor and verify server status
- **`read_logs`** - Read Unity console logs with filtering by type (Log, Warning, Error, etc.)
- **`refresh_assets`** - Refresh Unity assets and trigger recompilation

### GameObject Management (5 tools)
- **`create_gameobject`** - Create GameObjects with primitives, transforms, tags, and layers
- **`find_gameobject`** - Find GameObjects by name, tag, layer with pattern matching
- **`modify_gameobject`** - Modify GameObject properties (transform, name, active state, parent, etc.)
- **`delete_gameobject`** - Delete single or multiple GameObjects with optional child handling
- **`get_hierarchy`** - Get complete scene hierarchy with components and depth control

### Scene Management (5 tools)
- **`create_scene`** - Create new scenes with build settings integration and auto-loading
- **`load_scene`** - Load existing scenes in Single or Additive mode
- **`save_scene`** - Save current scene with Save As functionality
- **`list_scenes`** - List all scenes in project with filtering and build settings info
- **`get_scene_info`** - Get detailed scene information including GameObject counts

### Scene Analysis (5 tools)
- **`get_gameobject_details`** - Deep inspection of GameObjects with component details and hierarchy
- **`analyze_scene_contents`** - Comprehensive scene statistics, composition, and performance metrics
- **`get_component_values`** - Get all properties and values of specific components with metadata
- **`find_by_component`** - Find GameObjects by component type with scope filtering (scene/prefabs/all)
- **`get_object_references`** - Analyze references between objects including hierarchy and asset connections

### Play Mode Controls (4 tools)
- **`play_game`** - Start Unity play mode for testing and interaction
- **`pause_game`** - Pause or resume Unity play mode
- **`stop_game`** - Stop Unity play mode and return to edit mode
- **`get_editor_state`** - Get current Unity editor state (play mode, pause, compilation status)

### UI Interactions (5 tools) 🚧 *Coming in Phase 7*
- **`find_ui_elements`** - Locate UI elements in scene hierarchy with filtering
- **`click_ui_element`** - Simulate clicking on UI elements (buttons, toggles, etc.)
- **`get_ui_element_state`** - Get detailed UI element state and interaction capabilities
- **`set_ui_element_value`** - Set values for UI input elements (sliders, input fields, etc.)
- **`simulate_ui_input`** - Execute complex UI interaction sequences

## Development Status

This project provides **23 comprehensive tools** for Unity Editor automation through MCP. The implementation follows a test-driven development approach with 95%+ code coverage.

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

For detailed documentation, see the [docs/](docs/) directory.
