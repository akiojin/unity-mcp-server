# Unity MCP Server

MCP (Model Context Protocol) server for Unity Editor integration. Enables AI assistants like Claude and Cursor to interact directly with Unity Editor for automated game development.

## Features

- **106 comprehensive tools** across 16+ categories for Unity Editor automation
- **Tool discovery** - Efficient `search_tools` meta-tool for discovering relevant tools (96.2% token reduction)
- **GameObject management** - Create, find, modify, delete GameObjects with full hierarchy control
- **Component system** - Add, remove, modify components with property control
- **Scene management** - Create, load, save, list scenes with build settings integration
- **Scene analysis** - Deep inspection, component analysis, and performance metrics
- **Asset management** - Create and modify prefabs, materials, scripts with full control
- **UI automation** - Find, click, and interact with UI elements programmatically
- **Input simulation** - Simulate keyboard, mouse, gamepad, and touch input
- **Play mode controls** - Start, pause, stop Unity play mode for testing
- **Performance profiling** - Record profiling sessions, collect metrics, save .data files for analysis
- **Project settings** - Read and update Unity project settings safely
- **Editor operations** - Console logs, screenshots, video capture, compilation monitoring
- **Editor control** - Manage tags, layers, selection, windows, and tools

## Tool Discovery

Unity MCP Server provides a **`search_tools`** meta-tool for efficient tool discovery, helping you find relevant tools quickly.

### Usage Examples

```javascript
// Find tools for GameObject manipulation
{
  "tool": "search_tools",
  "params": {
    "query": "gameobject",
    "limit": 10
  }
}
// Returns: gameobject_create, gameobject_find, gameobject_modify, ...

// Filter by category
{
  "tool": "search_tools",
  "params": {
    "category": "scene",
    "limit": 10
  }
}
// Returns: scene_create, scene_load, scene_save, scene_list, scene_info_get

// Filter by tags
{
  "tool": "search_tools",
  "params": {
    "tags": ["create", "asset"],
    "limit": 5
  }
}
// Returns tools that create assets

// Include full input schemas (when needed)
{
  "tool": "search_tools",
  "params": {
    "query": "screenshot",
    "includeSchemas": true
  }
}
// Returns full tool definitions with inputSchema
```

### Benefits

- **Smart filtering** - Search by keywords, categories, tags, or scope (read/write/execute)
- **Relevance scoring** - Results sorted by relevance to your query
- **On-demand schemas** - Full inputSchema only when explicitly requested
- **Easy discovery** - Find the right tool without browsing all 103 tools manually

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
- `input_keyboard` — Keyboard input with batching, combos, typing, and auto-hold durations
- `input_mouse` — Mouse movement, clicks, drags, per-button press/hold, and batching
- `input_gamepad` — Gamepad buttons, sticks, triggers, d-pad with batching and timed holds
- `input_touch` — Touch gestures (tap/swipe/pinch/multi) with batched steps

#### 同時押下とホールドの扱い

- **単一アクションで同時押下**: キーボードは `action:"combo"`、タッチは `action:"multi"`、ゲームパッドのスティックは `action:"stick"` で X/Y を同時指定できます。
- **`actions[]` バッチ**: 異なるボタンやデバイスを同一フレームで実行したい場合は `actions:[{...},{...}]` に並べて送信します（順番を保持）。
- **ホールド時間**: `holdSeconds` を press/button/trigger などに付与すると、その秒数後に自動で release/state reset がスケジュールされます。省略すると押下状態が維持されるので、手動で release アクションを送ってください。
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
- `test_get_status` — Query Unity Test Runner progress/results. Parameters:
  - `includeTestResults` (bool, default `false`): attaches the latest exported `.unity/test-results/*.json` summary to the response when a test run has completed.
  - `includeFileContent` (bool, default `false`): when combined with `includeTestResults`, also returns the JSON file contents as a string so agents can parse the detailed per-test data without reading the file directly.

## Architecture

### Dependencies

Unity MCP Server uses the following components for code indexing and analysis:

| Component | Purpose | Distribution | Notes |
|-----------|---------|--------------|-------|
| **sql.js** | Code index database | npm dependency | Pure JS/WASM, no native compilation |
| **csharp-lsp** | C# symbol analysis | Downloaded on first use | ~80 MB per platform |

#### Why sql.js?

We use **sql.js** (pure JavaScript/WebAssembly SQLite) for the code index database:

- **Zero native compilation**: Works immediately via `npx` without build tools
- **Cross-platform**: Same code runs on all Node.js platforms
- **No installation delays**: Avoids 30+ second native module compilation timeouts

**Trade-off**: sql.js is 1.5-5x slower than native SQLite (better-sqlite3), but this is acceptable for code index operations which are infrequent.

#### csharp-lsp Distribution

**csharp-lsp (downloaded on first use)**:

- Large size (~80 MB per platform, ~480 MB for all 6 platforms)
- Too large to bundle in npm package
- Downloaded from GitHub Release on first use of script editing tools

#### Supported Platforms

| Platform | sql.js | csharp-lsp |
|----------|--------|------------|
| Linux x64 | ✅ Built-in | ✅ Downloaded (~79 MB) |
| Linux arm64 | ✅ Built-in | ✅ Downloaded (~86 MB) |
| macOS x64 | ✅ Built-in | ✅ Downloaded (~80 MB) |
| macOS arm64 (Apple Silicon) | ✅ Built-in | ✅ Downloaded (~86 MB) |
| Windows x64 | ✅ Built-in | ✅ Downloaded (~80 MB) |
| Windows arm64 | ✅ Built-in | ✅ Downloaded (~85 MB) |

#### Storage Locations

- **csharp-lsp**: `~/.unity/tools/csharp-lsp/<rid>/`
- **Code index database**: `<workspace>/.unity/cache/code-index/code-index.db`

## Requirements

- **Unity**: 2020.3 LTS or newer (Unity 6 supported)
- **Node.js**: 18.0.0 or newer
- **MCP Client**: Claude Desktop, Cursor, or compatible client

## Performance Benchmark

Response time comparison between Code Index tools and standard Claude Code tools (with DB index built, `watch: true` enabled):

| Operation | unity-mcp-server | Time | Standard Tool | Time | Result |
|-----------|------------------|------|---------------|------|--------|
| File Read | `script_read` | **instant** | `Read` | **instant** | EQUAL |
| Symbol List | `script_symbols_get` | **instant** | N/A | N/A | PASS |
| Symbol Find | `script_symbol_find` | **instant** | `Grep` | **instant** | EQUAL |
| Text Search | `script_search` | **instant** | `Grep` | **instant** | EQUAL |
| Reference Find | `script_refs_find` | **instant** | `Grep` | **instant** | EQUAL |
| Index Status | `code_index_status` | **instant** | N/A | N/A | PASS |

**Note**: Performance above requires DB index to be built. Run `code_index_build` before first use.

### Worker Thread Implementation

Since v2.41.x, background index builds run in Worker Threads, so MCP tools are never blocked even with `watch: true`:

| Scenario | Before Worker Thread | After Worker Thread |
|----------|---------------------|---------------------|
| `system_ping` | **60+ seconds block** | **instant** |
| `code_index_status` | **60+ seconds block** | **instant** |
| Any MCP tool | timeout during build | **instant** |

See [`docs/benchmark.md`](../docs/benchmark.md) for detailed benchmark results.

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

### MCP Client Shows "Capabilities: none"

If your MCP client (Claude Code, Cursor, etc.) shows "Capabilities: none" despite successful connection:

**Symptom**: Server connects successfully, but no tools are visible to the client.

**Root Cause**: Empty capability objects (`resources: {}`, `prompts: {}`) in MCP SDK v0.6.1 cause capability validation to fail silently.

**Solution**: Update to latest version with the fix:

```bash
# Update to latest version (2.41.0+)
npm update -g @akiojin/unity-mcp-server

# Or reinstall
npm uninstall -g @akiojin/unity-mcp-server
npm install -g @akiojin/unity-mcp-server
```

**Verification**: After restart, your MCP client should display 107 available tools.

## Repository

Full source code and documentation: <https://github.com/akiojin/unity-mcp-server>

## Release Automation

- Releases are generated by release-please on `main`.
  - If changes are in develop, run `scripts/prepare-release-pr.sh` (creates/auto-merges develop→main PR).
  - release-please runs on main and publishes via tags; no automatic back-merge to develop.
- Required checks: Markdown, ESLint & Formatting / Commit Message Lint / Test & Coverage / Package.
- Tags trigger `publish.yml` to push npm, OpenUPM (via tag), and csharp-lsp artifacts; Unity package version is kept in sync via release-please extra-files.
- If OpenUPM lags, create a new release so the tag and Unity package version match.

## License

MIT License - see LICENSE file for details.
