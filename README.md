# Unity Editor MCP

[![CI](https://github.com/ozankasikci/unity-editor-mcp/actions/workflows/test-coverage.yml/badge.svg)](https://github.com/ozankasikci/unity-editor-mcp/actions/workflows/test-coverage.yml)
[![codecov](https://codecov.io/gh/ozankasikci/unity-editor-mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/ozankasikci/unity-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/unity-editor-mcp)](https://www.npmjs.com/package/unity-editor-mcp)

> ⚠️ **This project is in beta and under heavy development.** Features and APIs may change. Use at your own discretion.

Unity Editor MCP (Model Context Protocol) enables AI assistants like Claude and Cursor to interact directly with the Unity Editor, allowing for AI-assisted game development and automation.

## 🚀 Key Features

- **🎮 GameObject Management**: Create primitives, modify transforms, manage hierarchy, and delete objects
- **🔧 Component System**: Add, remove, modify, and list components on GameObjects with full property control
- **🎭 Prefab Workflow**: Complete prefab mode editing - open, modify, save, and exit with override management
- **🔍 Smart Search**: Find GameObjects by name, tag, layer, or component type with exact/partial matching
- **📊 Scene Analysis**: Analyze scene composition, component statistics, and prefab connections
- **🎯 Component Inspection**: Get component values, find objects by component, trace references between objects
- **🎬 Scene Control**: Create, load, save scenes, manage build settings, and work with multiple scenes
- **🏃 Play Mode Testing**: Start, pause, and stop play mode, check editor state and compilation status
- **🖼️ Screenshot Capture**: Take screenshots of Game View or Scene View with analysis capabilities
- **🎨 Asset Management**: Create and modify prefabs, materials, scripts with comprehensive property control
- **🖱️ UI Automation**: Interact with Unity UI elements programmatically for testing and automation
- **📝 Console Integration**: Read Unity console logs filtered by type with enhanced debugging features
- **🔄 Editor Operations**: Refresh assets, execute menu items, and trigger recompilation


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

Unity Editor MCP provides **69 comprehensive tools** across 12 categories for complete Unity Editor automation:

### System & Core Tools (2 tools)
- **`ping`** - Test connection to Unity Editor and verify server status
- **`refresh_assets`** - Refresh Unity assets and trigger recompilation

### GameObject Management (5 tools)
- **`create_gameobject`** - Create GameObjects with primitives, transforms, tags, and layers
- **`find_gameobject`** - Find GameObjects by name, tag, layer with pattern matching
- **`modify_gameobject`** - Modify GameObject properties (transform, name, active state, parent, etc.)
- **`delete_gameobject`** - Delete single or multiple GameObjects with optional child handling
- **`get_hierarchy`** - Get complete scene hierarchy with components and depth control, supports rootPath to start from specific GameObject

### Component System (5 tools)
- **`add_component`** - Add Unity components to GameObjects with initial property values
- **`remove_component`** - Remove components from GameObjects with safety checks (prevents Transform removal)
- **`modify_component`** - Modify component properties with support for nested properties using dot notation
- **`list_components`** - List all components on a GameObject with type information and removability status
- **`get_component_types`** - Discover available component types with filtering by category and addability

### Scene Management (5 tools)
- **`create_scene`** - Create new scenes with build settings integration and auto-loading
- **`load_scene`** - Load existing scenes in Single or Additive mode
- **`save_scene`** - Save current scene with Save As functionality
- **`list_scenes`** - List all scenes in project with filtering and build settings info
- **`get_scene_info`** - Get detailed scene information including GameObject counts

### Scene Analysis (7 tools)
- **`get_gameobject_details`** - Deep inspection of GameObjects with component details and hierarchy
- **`analyze_scene_contents`** - Comprehensive scene statistics, composition, and performance metrics
- **`get_component_values`** - Get all properties and values of specific components with metadata
- **`find_by_component`** - Find GameObjects by component type with scope filtering (scene/prefabs/all)
- **`get_object_references`** - Analyze references between objects including hierarchy and asset connections
- **`get_animator_state`** - Get current Animator state including layers, parameters, transitions and animation clips
- **`get_animator_runtime_info`** - Get runtime Animator info including IK, root motion, and performance data (Play mode only)

### Asset Management (11 tools)
- **`create_prefab`** - Create prefabs from GameObjects or empty templates with overwrite options
- **`modify_prefab`** - Modify existing prefabs with property changes and instance updates
- **`instantiate_prefab`** - Instantiate prefabs in scenes with transform and parenting options
- **`open_prefab`** - Open prefabs in Unity's prefab mode for detailed editing with focus and isolation
- **`exit_prefab_mode`** - Exit prefab mode with optional save/discard changes
- **`save_prefab`** - Save prefab changes in prefab mode or apply instance overrides to prefab assets
- **`create_material`** - Create new materials with shader assignment and property configuration
- **`modify_material`** - Modify existing materials with shader changes and property updates
- **`manage_asset_import_settings`** - Manage Unity asset import settings (get, modify, apply presets, reimport)
- **`manage_asset_database`** - Manage Unity Asset Database operations (find, info, create folders, move, copy, delete, refresh)
- **`analyze_asset_dependencies`** - Analyze Unity asset dependencies (get dependencies, dependents, circular deps, unused assets, size impact)

### Script Management (6 tools)
- **`create_script`** - Create new C# scripts with templates and namespace management
- **`read_script`** - Read script file contents with syntax highlighting information
- **`update_script`** - Modify existing scripts with content replacement and validation
- **`delete_script`** - Delete script files with dependency checking and confirmation
- **`list_scripts`** - List all scripts in project with filtering and metadata
- **`validate_script`** - Validate script syntax and check for compilation errors

### Play Mode Controls (4 tools)
- **`play_game`** - Start Unity play mode for testing and interaction
- **`pause_game`** - Pause or resume Unity play mode
- **`stop_game`** - Stop Unity play mode and return to edit mode
- **`get_editor_state`** - Get current Unity editor state (play mode, pause, compilation status)

### UI Automation (5 tools)
- **`find_ui_elements`** - Locate UI elements in scene hierarchy with filtering
- **`click_ui_element`** - Simulate clicking on UI elements (buttons, toggles, etc.)
- **`get_ui_element_state`** - Get detailed UI element state and interaction capabilities
- **`set_ui_element_value`** - Set values for UI input elements (sliders, input fields, etc.)
- **`simulate_ui_input`** - Execute complex UI interaction sequences

### Input System Simulation (6 tools) 🆕
- **`simulate_keyboard`** - Simulate keyboard input (press, release, type text, key combos)
- **`simulate_mouse`** - Simulate mouse input (move, click, drag, scroll)
- **`simulate_gamepad`** - Simulate gamepad/controller input (buttons, sticks, triggers, d-pad)
- **`simulate_touch`** - Simulate touch input (tap, swipe, pinch, multi-touch)
- **`input_system`** - Main handler for Input System operations
- **`get_current_input_state`** - Get current state of all input devices

### Editor Operations (5 tools)
- **`execute_menu_item`** - Execute Unity menu items programmatically with safety checks
- **`clear_console`** - Clear Unity console logs with optional filtering
- **`read_console`** - Read Unity console logs with advanced filtering, search, and export capabilities
- **`capture_screenshot`** - Take screenshots of Game View or Scene View with custom resolution and encoding
- **`analyze_screenshot`** - Analyze screenshot content with basic image analysis capabilities

### Editor Control & Automation (8 tools)
- **`manage_tags`** - Manage Unity project tags (add, remove, list)
- **`manage_layers`** - Manage Unity project layers (add, remove, list, convert index/name)
- **`manage_selection`** - Manage Unity Editor selection (get, set, clear, get details)
- **`manage_windows`** - Manage Unity Editor windows (list, focus, get state)
- **`manage_tools`** - Manage Unity Editor tools and plugins (list, activate, deactivate, refresh)
- **`start_compilation_monitoring`** - Start monitoring Unity compilation with real-time error detection
- **`stop_compilation_monitoring`** - Stop compilation monitoring and get final status
- **`get_compilation_state`** - Get current Unity compilation state and errors


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
