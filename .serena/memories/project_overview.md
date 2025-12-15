# Unity MCP Server - Project Overview

## Purpose
Unity MCP Server is an MCP (Model Context Protocol) server that enables AI assistants to control Unity Editor for AI-assisted game development workflows.

## Tech Stack
- **Runtime**: Node.js 18-22 (ES Modules)
- **Protocol**: MCP SDK (@modelcontextprotocol/sdk)
- **Database**: SQLite via better-sqlite3 (code index)
- **Unity Side**: C# Editor Extensions (Unity 2021.3+)
- **Build Tool**: C# LSP (Roslyn-based)

## Project Structure
- `mcp-server/` - Node.js MCP server (main implementation)
- `UnityMCPServer/` - Unity project with C# Editor extensions
  - `Packages/unity-mcp-server/` - UPM package (C# implementation)
- `csharp-lsp/` - C# Language Server for code editing
- `docs/` - Documentation
- `specs/` - Feature specifications (SDD)

## Languages
- **JavaScript (ES Modules)**: MCP server implementation
- **C#**: Unity Editor extensions

## Important Notes
- C# files are in `UnityMCPServer/Packages/unity-mcp-server/Editor/`
- Use unity-mcp-server tools for C# editing (not Serena)
