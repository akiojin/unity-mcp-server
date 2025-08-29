# Unity Editor MCP

Read this in Japanese: [README.ja.md](./README.ja.md)

Unity Editor integration with Model Context Protocol (MCP) for AI-assisted development.

This Unity package exposes editor operations (e.g., listing and modifying components) via MCP-compatible commands to enable IDE/agent workflows.

## Installation

- Open Unity Package Manager and choose “Add package from Git URL…”.
- Use this URL (UPM subfolder):

```
https://github.com/akiojin/unity-editor-mcp.git?path=UnityEditorMCP/Packages/unity-editor-mcp
```

## Features

- Component operations: add, remove, modify, and list components on GameObjects.
- Type-safe value conversion for common Unity types (Vector2/3, Color, Quaternion, enums).
- Extensible editor handlers designed for MCP commands.

## Directory Structure

- `Editor/`: MCP command handlers and editor-side logic.
- `Tests/`: Editor test sources.
- `docs/`: Documentation, including this README and the Japanese translation.

## License

MIT

## Repository

GitHub: https://github.com/akiojin/unity-editor-mcp
