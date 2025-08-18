# Unity Editor MCP Server

MCP (Model Context Protocol) server for Unity Editor integration. Enables AI assistants like Claude and Cursor to interact directly with Unity Editor for automated game development.

## Features

- **70 comprehensive tools** across 13 categories for Unity Editor automation
- **GameObject management** - Create, find, modify, delete GameObjects with full hierarchy control
- **Component system** - Add, remove, modify components with property control
- **Scene management** - Create, load, save, list scenes with build settings integration
- **Scene analysis** - Deep inspection, component analysis, and performance metrics
- **Asset management** - Create and modify prefabs, materials, scripts with full control
- **UI automation** - Find, click, and interact with UI elements programmatically
- **Input simulation** - Simulate keyboard, mouse, gamepad, and touch input
- **Play mode controls** - Start, pause, stop Unity play mode for testing
- **Project settings** - Read and update Unity project settings safely
- **Editor operations** - Console logs, screenshots, compilation monitoring
- **Editor control** - Manage tags, layers, selection, windows, and tools

## Quick Start

### Using npx (Recommended)

```bash
npx @akiojin/unity-editor-mcp@latest
```

### Global Installation

```bash
npm install -g @akiojin/unity-editor-mcp
unity-editor-mcp
```

### Local Installation

```bash
npm install @akiojin/unity-editor-mcp
npx unity-editor-mcp
```

## Unity Setup

1. Install the Unity package from: `https://github.com/akiojin/unity-editor-mcp.git?path=unity-editor-mcp`
2. Open Unity Package Manager → Add package from git URL
3. The package will automatically start a TCP server on port 6400

## MCP Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "unity-editor-mcp": {
      "command": "npx",
      "args": ["@akiojin/unity-editor-mcp@latest"]
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

## Available Tools (70 Tools)

### System & Core Tools (2 tools)
- `ping` - Test connection to Unity Editor and verify server status
- `refresh_assets` - Refresh Unity assets and trigger recompilation

### GameObject Management (5 tools)
- `create_gameobject` - Create GameObjects with primitives, transforms, tags, and layers
- `find_gameobject` - Find GameObjects by name, tag, layer with pattern matching
- `modify_gameobject` - Modify GameObject properties (transform, name, active state, parent)
- `delete_gameobject` - Delete single or multiple GameObjects with child handling
- `get_hierarchy` - Get scene hierarchy with components and depth control

### Component System (5 tools)
- `add_component` - Add Unity components to GameObjects with initial properties
- `remove_component` - Remove components from GameObjects with safety checks
- `modify_component` - Modify component properties with nested property support
- `list_components` - List all components on a GameObject with type information
- `get_component_types` - Discover available component types with filtering

### Scene Management (5 tools)
- `create_scene` - Create new scenes with build settings integration
- `load_scene` - Load scenes in Single or Additive mode
- `save_scene` - Save current scene with Save As functionality
- `list_scenes` - List all scenes in project with filtering options
- `get_scene_info` - Get detailed scene information including GameObject counts

### Scene Analysis (7 tools)
- `get_gameobject_details` - Deep inspection of GameObjects with component details
- `analyze_scene_contents` - Comprehensive scene statistics and performance metrics
- `get_component_values` - Get all properties and values of specific components
- `find_by_component` - Find GameObjects by component type with scope filtering
- `get_object_references` - Analyze references between objects and assets
- `get_animator_state` - Get current Animator state, parameters, and transitions
- `get_animator_runtime_info` - Get runtime Animator info (Play mode only)

### Asset Management (11 tools)
- `create_prefab` - Create prefabs from GameObjects or templates
- `modify_prefab` - Modify existing prefabs with property changes
- `instantiate_prefab` - Instantiate prefabs in scenes with transform options
- `open_prefab` - Open prefabs in Unity's prefab mode for editing
- `exit_prefab_mode` - Exit prefab mode with save/discard options
- `save_prefab` - Save prefab changes or apply instance overrides
- `create_material` - Create new materials with shader and properties
- `modify_material` - Modify material properties and shaders
- `manage_asset_import_settings` - Manage asset import settings and presets
- `manage_asset_database` - Asset database operations (find, move, copy, delete)
- `analyze_asset_dependencies` - Analyze asset dependencies and find unused assets

### Script Management (6 tools)
- `create_script` - Create new C# scripts with templates (MonoBehaviour, ScriptableObject, etc.)
- `read_script` - Read script file contents with syntax highlighting
- `update_script` - Modify existing scripts with validation
- `delete_script` - Delete script files with dependency checking
- `list_scripts` - List all scripts in project with filtering and metadata
- `validate_script` - Validate script syntax and Unity compatibility

### Play Mode Controls (4 tools)
- `play_game` - Start Unity play mode for testing
- `pause_game` - Pause or resume Unity play mode
- `stop_game` - Stop Unity play mode and return to edit mode
- `get_editor_state` - Get current editor state and compilation status

### UI Automation (5 tools)
- `find_ui_elements` - Locate UI elements by type, tag, or name
- `click_ui_element` - Simulate clicking on UI elements (buttons, toggles)
- `get_ui_element_state` - Get UI element properties and interaction state
- `set_ui_element_value` - Set values for input fields, sliders, dropdowns
- `simulate_ui_input` - Execute complex UI interaction sequences

### Input System Simulation (5 tools)
- `simulate_keyboard` - Simulate keyboard input with key combos and text typing
- `simulate_mouse` - Simulate mouse movement, clicks, drags, and scrolling
- `simulate_gamepad` - Simulate gamepad buttons, sticks, triggers, and d-pad
- `simulate_touch` - Simulate touch gestures (tap, swipe, pinch, multi-touch)
- `get_current_input_state` - Get current state of all input devices

### Editor Operations (5 tools)
- `execute_menu_item` - Execute Unity menu items programmatically
- `clear_console` - Clear Unity console logs with filtering options
- `read_console` - Read console logs with advanced filtering and search
- `capture_screenshot` - Take screenshots of Game View or Scene View
- `analyze_screenshot` - Analyze screenshot content with image analysis

### Editor Control & Automation (8 tools)
- `manage_tags` - Manage Unity project tags (add, remove, list)
- `manage_layers` - Manage Unity project layers with index conversion
- `manage_selection` - Manage Editor selection (get, set, clear)
- `manage_windows` - Manage Editor windows (list, focus, get state)
- `manage_tools` - Manage Editor tools and plugins
- `start_compilation_monitoring` - Start monitoring compilation with error detection
- `stop_compilation_monitoring` - Stop compilation monitoring
- `get_compilation_state` - Get current compilation state and errors

### Project Settings Management (2 tools)
- `get_project_settings` - Read Unity project settings with granular control
  - Player, Graphics, Quality, Physics, Audio, Time settings
  - Build settings, Tags and layers configuration
- `update_project_settings` - Safely update project settings
  - Requires explicit confirmation for safety
  - Supports partial updates to specific categories

## Requirements

- **Unity**: 2020.3 LTS or newer (Unity 6 supported)
- **Node.js**: 18.0.0 or newer
- **MCP Client**: Claude Desktop, Cursor, or compatible client

## Troubleshooting

### Connection Issues
1. Ensure Unity Editor is running with the Unity package installed
2. Check Unity console for connection messages
3. Verify port 6400 is not blocked by firewall

### Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm uninstall -g @akiojin/unity-editor-mcp
npm install -g @akiojin/unity-editor-mcp
```

## Repository

Full source code and documentation: https://github.com/akiojin/unity-editor-mcp

## License

MIT License - see LICENSE file for details.