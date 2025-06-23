# Unity Editor MCP Server

MCP (Model Context Protocol) server for Unity Editor integration. Enables AI assistants like Claude and Cursor to interact directly with Unity Editor for automated game development.

## Features

- **23 comprehensive tools** for Unity Editor automation
- **GameObject management** - Create, find, modify, delete GameObjects
- **Scene management** - Create, load, save, list scenes  
- **Scene analysis** - Deep inspection and component analysis
- **Play mode controls** - Start, pause, stop Unity play mode
- **System tools** - Console logs, asset refresh, connection testing

## Quick Start

### Using npx (Recommended)

```bash
npx unity-editor-mcp
```

### Global Installation

```bash
npm install -g unity-editor-mcp
unity-editor-mcp
```

### Local Installation

```bash
npm install unity-editor-mcp
npx unity-editor-mcp
```

## Unity Setup

1. Install the Unity package from: `https://github.com/ozankasikci/unity-mcp.git?path=unity-editor-mcp`
2. Open Unity Package Manager → Add package from git URL
3. The package will automatically start a TCP server on port 6402

## MCP Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

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

### Alternative (if globally installed)

```json
{
  "mcpServers": {
    "unity-editor-mcp": {
      "command": "unity-editor-mcp"
    }
  }
}
```

## Available Tools

### System & Core (3 tools)
- `ping` - Test Unity Editor connection
- `read_logs` - Read Unity console logs 
- `refresh_assets` - Trigger asset recompilation

### GameObject Management (5 tools)
- `create_gameobject` - Create GameObjects with primitives and transforms
- `find_gameobject` - Find GameObjects by name, tag, layer
- `modify_gameobject` - Modify GameObject properties
- `delete_gameobject` - Delete GameObjects
- `get_hierarchy` - Get scene hierarchy

### Scene Management (5 tools)
- `create_scene` - Create new scenes
- `load_scene` - Load scenes (Single/Additive)
- `save_scene` - Save current scene
- `list_scenes` - List project scenes
- `get_scene_info` - Get scene details

### Scene Analysis (5 tools)  
- `get_gameobject_details` - Deep GameObject inspection
- `analyze_scene_contents` - Scene statistics and analysis
- `get_component_values` - Component property inspection
- `find_by_component` - Find objects by component type
- `get_object_references` - Analyze object relationships

### Play Mode Controls (4 tools)
- `play_game` - Start Unity play mode
- `pause_game` - Pause/resume play mode  
- `stop_game` - Stop play mode
- `get_editor_state` - Get editor state

## Requirements

- **Unity**: 2020.3 LTS or newer
- **Node.js**: 18.0.0 or newer
- **MCP Client**: Claude Desktop, Cursor, or compatible client

## Troubleshooting

### Connection Issues
1. Ensure Unity Editor is running with the Unity package installed
2. Check Unity console for connection messages
3. Verify port 6402 is not blocked by firewall

### Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm uninstall -g unity-editor-mcp
npm install -g unity-editor-mcp
```

## Repository

Full source code and documentation: https://github.com/ozankasikci/unity-mcp

## License

MIT License - see LICENSE file for details.