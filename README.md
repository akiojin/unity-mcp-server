# Unity MCP Server

English | [日本語](README.ja.md)

## Overview

Unity MCP Server lets LLM-based clients automate the Unity Editor. It focuses on reliable, scriptable workflows with a simple interface and zero or low-configuration setup.

## What It Can Do

- **Editor automation**: Create/modify scenes, GameObjects, components, prefabs, materials
- **UI automation**: Locate and interact with UI, validate UI state
- **Input simulation**: Keyboard/mouse/gamepad/touch for playmode testing (Input System only)
- **Visual capture**: Deterministic screenshots from Game/Scene/Explorer/Window views
- **Code base awareness**: Safe structured edits and accurate symbol/search powered by bundled C# LSP (no `.sln` file required)
- **Project control**: Read/update project/editor settings; read logs, monitor compilation
- **Addressables management**: Register/organize assets, manage groups, build automation

## Performance

Code index tools outperform standard file operations:

| Operation        | Code Index Tool      | Standard Tool | Advantage                  |
| ---------------- | -------------------- | ------------- | -------------------------- |
| Symbol lookup    | `find_script_symbol` | `grep`        | **Instant** vs 350ms       |
| Reference search | `find_script_refs`   | `grep`        | **Structured** results     |
| Code search      | `search_script`      | `grep`        | **3-5x smaller** responses |

Key benefits:

- **128,040 files indexed** with 100% coverage
- **Non-blocking** background index builds (Worker Threads)
- **LLM-optimized** output with pagination and size limits

> For detailed benchmarks, see [docs/benchmark-results-2025-12-13.md](docs/benchmark-results-2025-12-13.md)

## Requirements

- Unity 2020.3 LTS or newer
- Node.js 18.x / 20.x / 22.x LTS (23+ not supported)
- Claude Desktop or another MCP-compatible client

## Installation

### Unity Package

Package Manager → Add from git URL:

```
https://github.com/akiojin/unity-mcp-server.git?path=UnityMCPServer/Packages/unity-mcp-server
```

Or via OpenUPM:

```bash
openupm add com.akiojin.unity-mcp-server
```

### MCP Client Configuration

Configure your MCP client (Claude Desktop example):

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

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

### HTTP Mode (for HTTP-only networks)

```bash
npx @akiojin/unity-mcp-server --http 6401 --no-telemetry
curl http://localhost:6401/healthz
```

## Quick Start

1. **Install the Unity package** (Git URL or OpenUPM)
2. **Configure your MCP client** with the JSON above
3. **Open your Unity project** (package starts TCP listener on port 6400)
4. **Launch your MCP client** (it connects to the Node server)
5. **Test the connection** with `ping`

> Tip: `npx @akiojin/unity-mcp-server@latest` downloads and runs the latest build without cloning.

## Architecture

```
┌────────────────┐        JSON-RPC (MCP)        ┌──────────────────────┐
│  MCP Client    │ ───────────────────────────▶ │  Node MCP Server     │
│ (Claude/Codex/ │ ◀─────────────────────────── │ (@akiojin/unity-     │
│   Cursor …)    │        tool responses        │ mcp-server)          │
└────────────────┘                              └──────────┬───────────┘
                                                         TCP│6400
                                                            ▼
                                                   ┌───────────────────┐
                                                   │  Unity Editor     │
                                                   │  (Package opens   │
                                                   │   TCP listener)   │
                                                   └───────────────────┘
```

## Configuration

Configuration is optional; defaults work without any config file.

Node-side configuration uses **environment variables**, and Unity-side host/port lives in **Project Settings**.

See [docs/configuration.md](docs/configuration.md).

## Tools

Unity MCP Server ships **100+ tools**. Use the `search_tools` meta-tool to discover the right tool quickly.

See [docs/tools.md](docs/tools.md) for discovery tips and the recommended Code Index workflow.

## Claude Code Skills

This package includes Claude Code skills that provide workflow-oriented guidance for effectively using the 108+ tools.

### Available Skills

| Skill                          | Description                                                                              | Triggers                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `mcp-server-development`       | Build MCP servers (TypeScript SDK), implement tools/resources/prompts, JSON-RPC patterns | "MCP server", "tool handler", "JSON-RPC", "TypeScript"        |
| `unity-csharp-editing`         | C# script editing, search, refactoring with TDD workflow                                 | "C# edit", "script search", "refactoring"                     |
| `unity-scene-management`       | Scene, GameObject, Component management                                                  | "scene create", "GameObject", "component add"                 |
| `unity-playmode-testing`       | PlayMode control, input simulation, UI automation                                        | "playmode", "input simulate", "UI click"                      |
| `unity-asset-management`       | Prefab, Material, Addressables management                                                | "prefab create", "material", "Addressables"                   |
| `unity-editor-imgui-design`    | Unity Editor IMGUI for EditorWindow/Inspector/PropertyDrawer (not for in-game UI)        | "EditorWindow", "Custom Inspector", "PropertyDrawer", "IMGUI" |
| `unity-game-ugui-design`       | In-game uGUI (Canvas/RectTransform/Anchors) UI design                                    | "uGUI", "Canvas", "RectTransform", "Anchors", "HUD"           |
| `unity-game-ui-toolkit-design` | In-game UI Toolkit (UXML/USS/Flexbox) UI design                                          | "UI Toolkit", "UXML", "USS", "VisualElement", "Flexbox"       |

### Installation

Install as a Claude Code plugin from GitHub:

```bash
# Step 1: Add marketplace
/plugin marketplace add akiojin/unity-mcp-server

# Step 2: Install plugin
/plugin install unity-mcp-server@unity-mcp-server
```

Or manually copy the `.claude/skills/` directory to your project.

### Usage

Skills activate automatically when you mention related keywords. You can also invoke them directly:

```
# Ask about C# editing workflow
"How do I edit Unity C# scripts?"

# Ask about scene management
"Create a new scene with basic lighting"

# Ask about testing
"How do I simulate keyboard input in playmode?"
```

## Troubleshooting

See [docs/troubleshooting/README.md](docs/troubleshooting/README.md).

## OpenUPM Scoped Registry

To use OpenUPM packages, add the scoped registry to your project:

### Via Project Settings

1. `Edit > Project Settings > Package Manager`
2. Under **Scoped Registries**, click **+**
3. Add:
   - **Name**: `OpenUPM`
   - **URL**: `https://package.openupm.com`
   - **Scopes**: `com.akiojin`, `com.akiojin.unity-mcp-server`

### Via manifest.json

```json
"scopedRegistries": [
  {
    "name": "OpenUPM",
    "url": "https://package.openupm.com",
    "scopes": ["com.akiojin", "com.akiojin.unity-mcp-server"]
  }
]
```

## Repository Structure

```
.unity/
├── cache/           # Local caches (git-ignored)
└── capture/         # Screenshots/videos (git-ignored)

UnityMCPServer/
├── Packages/unity-mcp-server/  # UPM package (source)
└── Assets/                     # Samples only

mcp-server/          # Node MCP server

csharp-lsp/          # Roslyn-based LSP tool
```

## Feature Documentation

All features are documented with SDD format: [`specs/`](specs/)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, commit guidelines, and PR process.

## Development Documentation

For internal development details (Spec Kit, release process, LLM optimization):

- [docs/README.md](docs/README.md)
- [docs/development.md](docs/development.md)
- [CLAUDE.md](CLAUDE.md)

## License

MIT License - see [LICENSE](LICENSE) file.
