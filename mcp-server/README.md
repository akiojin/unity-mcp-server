# Unity MCP Server

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
npx @akiojin/unity-mcp-server@latest
```

### Global Installation

```bash
npm install -g @akiojin/unity-mcp-server
unity-mcp-server
```

### Local Installation

```bash
npm install @akiojin/unity-mcp-server
npx unity-mcp-server
```

## Unity Setup

1. Install the Unity package from: `https://github.com/akiojin/unity-mcp-server.git?path=UnityMCPServer/Packages/unity-mcp-server`
2. Open Unity Package Manager → Add package from git URL
3. The package will automatically start a TCP server on port 6400

## MCP Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "unity-mcp-server": {
      "command": "npx",
      "args": ["@akiojin/unity-mcp-server@latest"]
    }
  }
}
```

### Alternative (if globally installed)

```json
{
  "mcpServers": {
    "unity-mcp-server": {
      "command": "unity-mcp-server"
    }
  }
}
```

## Code Index Workflow

コードの自動編集を安定させるには、以下の 3 ステップでコードインデックスを運用してください。重いフルテストを回す必要はありません。

1. **初回または大幅変更後に `code_index_build`**  
   プロジェクト内の `Assets/` と `Packages/` の C# をすべてスキャンし、`.unity/cache/code-index/code-index.db` にシンボルを格納します。
2. **ファイル更新後は `code_index_update`**  
   編集したファイルだけを配列で渡すと、LSP から最新シンボルを再取得してインデックスを差分更新します。長時間待ちになる `code_index_build` の再実行を避けられます。
3. **シンボル取得時は `script_symbol_find`**  
   インデックスが利用可能なら高速に、未構築でも LSP にフォールバックして定義位置を取得できます。`script_edit_*` ツールに渡す `symbolName` 構築に活用してください。

> **Tip:** `code_index_update` は JSON パラメータ `paths` に絶対パス／相対パスの配列を渡すだけで完了します。内部で存在チェックと LSP リトライを行うため、Unity を起動したままでも短時間で終わります。

### インデックス状態を検証したいとき

ビルド中・未構築・完了後といったステータスを再現したい場合は、`code_index_build` に `delayStartMs` や `throttleMs` を付けて進捗を意図的に保ちます。さらに、`npm run simulate:code-index` を実行すると以下が自動化されます。

- 既存インデックスのリセット（`--reset`）
- `code_index_build` のバックグラウンド実行（任意の `--delayStart=MS` / `--throttle=MS`）
- 指定間隔での `code_index_status` ポーリング（`--poll=MS`）

出力される JSON を追うことで、`ready: false` → `true` へ遷移する様子や `buildJob.status` の変化を簡単に確認できます。

## Available Tools (Standardized Names)

### System & Core Tools
- `system_ping` — Test connection to Unity Editor and verify server status
- `system_refresh_assets` — Refresh Unity assets and trigger recompilation
- `system_get_command_stats` — Retrieve recent MCP command usage metrics

### GameObject Management
- `gameobject_create` — Create GameObjects with primitives, transforms, tags, and layers
- `gameobject_find` — Find GameObjects by name, tag, or layer with pattern matching
- `gameobject_modify` — Modify GameObject properties (transform, name, active state, parent)
- `gameobject_delete` — Delete single or multiple GameObjects with child handling
- `gameobject_get_hierarchy` — Inspect scene hierarchy with component details

### Component System
- `component_add` — Add Unity components to GameObjects with initial properties
- `component_remove` — Remove components from GameObjects with safety checks
- `component_modify` — Modify component properties with nested support
- `component_field_set` — Update serialized fields (including private `[SerializeField]` values, arrays, and nested structs)
- `component_list` — List all components on a GameObject with type information
- `component_get_types` — Discover available component types with filtering

### Scene Management
- `scene_create` — Create new scenes with build-settings integration
- `scene_load` — Load scenes in Single or Additive mode
- `scene_save` — Save the active scene (supports Save As)
- `scene_list` — List scenes in the project with filtering options
- `scene_info_get` — Retrieve detailed scene information including GameObject counts

### Analysis & Diagnostics
- `analysis_scene_contents_analyze` — Gather scene statistics and performance metrics
- `analysis_component_find` — Locate GameObjects by component type with scope filtering
- `analysis_component_values_get` — Inspect component properties and values
- `analysis_gameobject_details_get` — Deep inspection of GameObjects and components
- `analysis_object_references_get` — Trace references between objects and assets
- `analysis_animator_state_get` — Inspect Animator layers, parameters, and transitions
- `analysis_animator_runtime_info_get` — Retrieve runtime Animator diagnostics (Play Mode)

### Asset Management
- `asset_prefab_create` — Create prefabs from GameObjects or blank templates
- `asset_prefab_instantiate` — Instantiate prefabs with custom transforms
- `asset_prefab_modify` — Apply property overrides to existing prefabs
- `asset_prefab_open` — Open prefabs in Prefab Mode for editing
- `asset_prefab_exit_mode` — Exit Prefab Mode with save/discard handling
- `asset_prefab_save` — Save prefab changes or apply instance overrides
- `asset_material_create` — Create materials with shader and property setup
- `asset_material_modify` — Update material properties and shaders
- `asset_import_settings_manage` — Inspect or modify asset-import settings and presets
- `asset_database_manage` — Perform asset database operations (find, move, copy, delete)
- `asset_dependency_analyze` — Audit asset dependencies and identify unused assets

### Script & Code Tools
- `script_read` — Read script file contents with syntax-aware formatting
- `script_search` — Search C# sources by substring/regex/glob filters
- `script_symbols_get` — Enumerate symbols within a specific C# file
- `script_symbol_find` — Locate symbol definitions across the project
- `script_refs_find` — List references/usages for a symbol via C# LSP
- `script_edit_snippet` — Apply small text edits within C# files
- `script_edit_structured` — Perform structured symbol edits via C# LSP extensions
- `script_create_class` — Generate a new C# class file from parameters
- `script_remove_symbol` — Delete symbols (types/members) with reference checks
- `script_refactor_rename` — Rename symbols project-wide via LSP
- `script_packages_list` — List installed packages relevant to scripting
- `code_index_status` — Report status of the persistent code index

### Code Index Utilities
- `code_index_build` — フルスキャンでシンボルインデックスを再構築（開発時は `delayStartMs` や `throttleMs` で進捗観測用に速度調整可能）
- `code_index_update` — 変更した C# ファイルのみ差分再インデックス

### Play Mode Controls
- `playmode_play` — Enter Play Mode
- `playmode_pause` — Pause or resume Play Mode
- `playmode_stop` — Exit Play Mode back to Edit Mode
- `playmode_get_state` — Inspect current play/edit/compilation state
- `playmode_wait_for_state` — Await a target play/edit state

### UI Automation
- `ui_find_elements` — Locate UI elements by type, tag, or name
- `ui_click_element` — Simulate clicking UI buttons, toggles, etc.
- `ui_get_element_state` — Inspect UI element properties and interactability
- `ui_set_element_value` — Modify UI input values (sliders, fields, dropdowns)
- `ui_simulate_input` — Execute complex multi-step UI interaction sequences

### Input System Utilities
- `input_system_control` — Dispatch keyboard/mouse/gamepad/touch operations
- `input_keyboard_simulate` — Simulate keyboard input with combos or text
- `input_mouse_simulate` — Simulate mouse movement, clicks, drags, and scrolling
- `input_gamepad_simulate` — Simulate gamepad buttons, sticks, and triggers
- `input_touch_simulate` — Simulate touch gestures (tap, swipe, pinch)
- `input_action_add` — Add actions to an Input Action map
- `input_action_remove` — Remove actions from an Input Action map
- `input_action_map_create` — Create new Input Action maps
- `input_action_map_remove` — Delete existing Input Action maps
- `input_binding_add` — Add bindings to an action (including composites)
- `input_binding_remove` — Remove a specific binding from an action
- `input_binding_remove_all` — Clear all bindings from an action
- `input_binding_composite_create` — Create composite bindings (e.g., 2D vectors)
- `input_control_schemes_manage` — Manage control schemes and device lists
- `input_actions_state_get` — Inspect current Input Actions asset configuration
- `input_actions_asset_analyze` — Produce structured summaries of Input Actions assets

### Editor & Console Utilities
- `menu_item_execute` — Trigger Unity Editor menu items programmatically
- `console_clear` — Clear Unity console logs with filtering options
- `console_read` — Stream Unity console output with advanced filters
- `editor_tags_manage` — Manage project tags (add/remove/list)
- `editor_layers_manage` — Manage project layers with index conversion
- `editor_selection_manage` — Inspect or mutate the current editor selection
- `editor_windows_manage` — Enumerate or focus Unity editor windows
- `editor_tools_manage` — Manage editor tools and plugins
- `compilation_get_state` — Inspect current compilation state and errors

### Project Settings & Packages
- `settings_get` — Read Unity project settings with granular control
- `settings_update` — Safely update project settings (requires confirmation)
- `package_manage` — List or manage Unity packages via Package Manager
- `package_registry_config` — Configure package registries/scopes

### Asset Visualization & Capture
- `screenshot_capture` — Capture Game/Scene view screenshots
- `screenshot_analyze` — Run image analysis on captured screenshots
- `video_capture_start` — Begin recording the Game view to video
- `video_capture_stop` — Stop the current video recording
- `video_capture_status` — Inspect capture status / metadata
- `video_capture_for` — Record for a fixed duration before auto-stop

### Testing & Diagnostics
- `test_run` — Run Unity tests (EditMode/PlayMode)
- `test_get_status` — Query test runner progress/results (set `includeTestResults=true` to attach the latest exported file summary)

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
npm uninstall -g @akiojin/unity-mcp-server
npm install -g @akiojin/unity-mcp-server
```

## Repository

Full source code and documentation: <https://github.com/akiojin/unity-mcp-server>

## License

MIT License - see LICENSE file for details.
