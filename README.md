# Unity MCP Server

English | [日本語](README.ja.md)

## Overview

Unity MCP Server lets LLM-based clients automate the Unity Editor. It focuses on reliable, scriptable workflows with a simple interface and zero or low-configuration setup.

## What It Can Do

- **Editor automation**: Create/modify scenes, GameObjects, components, prefabs, materials
- **UI automation**: Locate and interact with UI, validate UI state
- **Input simulation**: Keyboard/mouse/gamepad/touch for playmode testing (Input System only)
- **Visual capture**: Deterministic screenshots from Game/Scene/Explorer/Window views
- **Code base awareness**: Safe structured edits and accurate symbol/search powered by bundled C# LSP
- **Project control**: Read/update project/editor settings; read logs, monitor compilation
- **Addressables management**: Register/organize assets, manage groups, build automation

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
5. **Test the connection** with `system_ping`

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

The server discovers `.unity/config.json` by walking up from the working directory (CWD matters).

See [docs/configuration.md](docs/configuration.md) for config file location and keys.

## Tools

Unity MCP Server ships **100+ tools**. Use the `search_tools` meta-tool to discover the right tool quickly.

See [docs/tools.md](docs/tools.md) for discovery tips and the recommended Code Index workflow.

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
├── config.json      # Workspace settings
└── capture/         # Screenshots/videos (git-ignored)

UnityMCPServer/
├── Packages/unity-mcp-server/  # UPM package (source)
└── Assets/                     # Samples only

mcp-server/          # Node MCP server

csharp-lsp/          # Roslyn-based LSP CLI
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
