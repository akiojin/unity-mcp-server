# Unity MCP Server (npm package)

MCP (Model Context Protocol) server for Unity Editor integration.
Enables AI assistants like Claude and Cursor to interact directly with Unity Editor for automated workflows.

This README documents the **npm package**.
For the Unity package, OpenUPM setup, and the full repository documentation, see:

- [github.com/akiojin/unity-mcp-server](https://github.com/akiojin/unity-mcp-server)

## Quick Start

### Using npx (Recommended)

```bash
npx @akiojin/unity-mcp-server@latest
```

### HTTP Mode (for HTTP-only networks)

```bash
npx @akiojin/unity-mcp-server@latest --http 6401 --no-telemetry
curl http://localhost:6401/healthz
```

## Unity Setup

1. Install the Unity package from:
   - [`https://github.com/akiojin/unity-mcp-server.git?path=UnityMCPServer/Packages/unity-mcp-server`](https://github.com/akiojin/unity-mcp-server.git?path=UnityMCPServer/Packages/unity-mcp-server)
2. Open Unity Package Manager → Add package from git URL
3. The package starts a TCP server (default port `6400`)

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

## Tools & Discovery

Unity MCP Server ships **100+ tools**.
Use the `search_tools` meta-tool to find the right tool quickly.

```json
{
  "tool": "search_tools",
  "params": {
    "query": "create gameobject",
    "limit": 10
  }
}
```

More details:
- Tools & Code Index workflow: [`docs/tools.md`](https://github.com/akiojin/unity-mcp-server/blob/main/docs/tools.md)
- Configuration reference: [`docs/configuration.md`](https://github.com/akiojin/unity-mcp-server/blob/main/docs/configuration.md)

## Requirements

- Unity 2020.3 LTS or newer
- Node.js 18.x / 20.x / 22.x LTS (23+ not supported)
- MCP client (Claude Desktop, Cursor, etc.)

## Troubleshooting

- Troubleshooting index: [`docs/troubleshooting/README.md`](https://github.com/akiojin/unity-mcp-server/blob/main/docs/troubleshooting/README.md)
- “Capabilities: none” fix: [`docs/troubleshooting/capabilities-none.md`](https://github.com/akiojin/unity-mcp-server/blob/main/docs/troubleshooting/capabilities-none.md)

## License

MIT License - see LICENSE file for details.
