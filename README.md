# Unity Editor MCP

English | [日本語](README.ja.md)

## Overview

Unity Editor MCP provides an MCP-compatible toolset to control the Unity Editor from LLM-based clients. It focuses on safe, scriptable editor automation with a consistent, minimal interface.

## Directory Structure

- `UnityEditorMCP/`: Unity project (Editor bridge, tools, samples)
- `mcp-server/`: Node.js MCP server that exposes Unity tools
- `docs/`: Documentation (guides, specs, troubleshooting)
- `scripts/`: Helper scripts for local development

## Quick Start

- Unity 2020.3 LTS or newer
- Node.js 18+ and npm
- Claude Desktop or another MCP-compatible client

Installation
- In Unity: Package Manager → Add from git URL → `https://github.com/akiojin/unity-editor-mcp.git?path=unity-editor-mcp`
- Configure MCP client (Claude Desktop example):
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`
  - Add:
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

Usage Flow
- Open Unity project (TCP listener starts on port 6400)
- Start your MCP client and call tools (e.g., ping, scene, script tools)

## Usage Examples

- Roll dice on UI button:
  - Add a Button in `Canvas`, attach binder script to call your game logic.
  - Use `script_edit_patch` to create/modify scripts; then `refresh_assets` and wait for compilation.
- Capture a screenshot:
  - Call `capture_screenshot` with `captureMode:"game"` and optional `includeUI:false`.
- Simulate input:
  - Use `simulate_keyboard`/`simulate_mouse`/`simulate_gamepad` for testing UI and gameplay.

## Quick Links

- Setup Guide: `docs/setup-guide.md`
- Script Architecture (Hybrid): `docs/script-architecture-hybrid.md`
- Technical Specification: `docs/technical-specification.md`

## Guidelines (Important)

- Use Unity MCP Script tools for all C# operations: `script_search`/`script_read`/`script_edit_patch`/`script_replace_pattern`/`script_edit_structured`.
- Always verify changes in order: preview → apply → `refresh_assets` → `wait_for_editor_state` (until `isCompiling:false`).
- Target paths under `UnityEditorMCP/Assets/**`.

## Troubleshooting (Short)

- Unity TCP not listening: reopen project; ensure port 6400 is free.
- Node.js cannot connect: Unity running? firewall? logs in Unity/Node terminals.
- Script tools missing types: refresh assets and wait until compilation completes.
- Technical Specification: `docs/technical-specification.md`

Note: Keep design details in `docs/`. README is intentionally minimal by project policy.
