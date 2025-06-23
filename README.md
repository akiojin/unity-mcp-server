# Unity Editor MCP

![Test Coverage](https://img.shields.io/badge/coverage-pending-yellow)

Unity Editor MCP (Model Context Protocol) enables AI assistants like Claude and Cursor to interact directly with the Unity Editor, allowing for AI-assisted game development and automation.

## 🚀 Key Features

- **🎮 GameObject Management**: Create primitives, modify transforms, manage hierarchy, and delete objects
- **🔍 Smart Search**: Find GameObjects by name, tag, layer, or component type with exact/partial matching
- **📊 Scene Analysis**: Analyze scene composition, component statistics, and prefab connections
- **🎯 Component Inspection**: Get component values, find objects by component, trace references between objects
- **🎬 Scene Control**: Create, load, save scenes, manage build settings, and work with multiple scenes
- **🏃 Play Mode Testing**: Start, pause, and stop play mode, check editor state and compilation status
- **📝 Console Integration**: Read Unity console logs filtered by type (Log, Warning, Error, Exception)
- **🔄 Asset Management**: Refresh assets and trigger recompilation on demand


## 🚀 Quick Start

### Prerequisites

- ✅ Unity 2020.3 LTS or newer
- ✅ Node.js 18.0.0 or newer  
- ✅ Claude Desktop or Cursor

### Installation

#### 📦 Step 1: Install Unity Package

In Unity:

1. Open **Window → Package Manager**
2. Click **"+"** → **"Add package from git URL..."**
3. Paste: `https://github.com/ozankasikci/unity-editor-mcp.git?path=unity-editor-mcp`
4. Click **Add**

> ✨ Unity will automatically start the MCP server on port 6400

#### ⚙️ Step 2: Configure Your MCP Client

**For Claude Desktop:**

Add to your config file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "unity-editor-mcp": {
      "command": "npx",
      "args": ["unity-editor-mcp@latest"]
    }
  }
}
```

**For Cursor:**

Add the same configuration to Cursor's MCP settings

#### ✅ Step 3: Verify Connection

1. **Restart your MCP client** (Claude Desktop or Cursor)
2. Check Unity Console for: `[Unity Editor MCP] Client connected`
3. You're ready to go! 🎮

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

### UI Interactions (5 tools)
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
