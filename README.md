# Unity Editor MCP

English | [日本語](README.ja.md)

## Overview

Unity Editor MCP lets LLM-based clients automate the Unity Editor. It focuses on reliable, scriptable workflows with a simple interface and zero- or low-configuration setup.

### Related Docs

- Video Capture Feature Plan: `docs/video-capture-plan.md`
- Planned: C# Language Server (self-contained) RFC: `docs/RFCs/0001-csharp-lsp.md`

### C# Editing Policy (Important)

- All C# symbol/search/structured edits are performed via an external CLI (roslyn-cli) bundled in this repo; no Unity communication is involved.
- Existing `script_*` tools now call the CLI under the hood, so edits are robust to Unity compilation/domain reload.
- Risky line-based patch/pattern replace tools were removed.

For Contributors

Developer setup and building `roslyn-cli` from source are documented in `CONTRIBUTING.md`. End users can ignore this; no .NET installation is required to use the tools.

roslyn-cli provisioning (multiple entry points)

- Default auto-provisioning (implemented)
  - Standard location: `WORKSPACE_ROOT/.unity/tools/roslyn-cli/<rid>/roslyn-cli`
  - Auto-build if bootstrap scripts are present, otherwise auto-download from GitHub Releases (with SHA256 verification)
  - No extra configuration or env variables required

- One-liner installers (UNIX / Windows PowerShell)
  - UNIX: `curl -fsSL https://raw.githubusercontent.com/akiojin/unity-editor-mcp/main/scripts/install-roslyn-cli.sh | bash -s -- --version <ver> --rid <rid>`
  - PowerShell: `irm https://raw.githubusercontent.com/akiojin/unity-editor-mcp/main/scripts/install-roslyn-cli.ps1 | iex` (e.g., `-Version 2.9.1 -Rid win-x64`)
  - Both install to `./.unity/tools/roslyn-cli/<rid>/`

- npx (available)
  - Example: `npx -y @akiojin/roslyn-cli ak-roslyn serve --solution <path>`
  - First-run resolves RID → downloads from GitHub Releases → verifies SHA256 → delegates to the binary
  - The binary is stored under `./.unity/tools/roslyn-cli/<rid>/roslyn-cli(.exe)` and reused next time

Common usage (MCP tools)

- Symbols: `script_symbol_find { "name": "ClassName", "kind": "class" }`
- References: `script_refs_find { "name": "MethodName" }`
- Replace body (preflight→apply):
  - `script_edit_structured { "operation": "replace_body", "path": "Packages/.../File.cs", "symbolName": "Class/Method", "newText": "{ /* ... */ }", "preview": true }`
  - then set `"preview": false` to apply if errors are empty
- Insert after class:
  - `script_edit_structured { "operation": "insert_after", "path": "...", "symbolName": "ClassName", "kind": "class", "newText": "\nprivate void X(){}\n", "preview": false }`

Run `AssetDatabase.Refresh` in Unity manually only when needed.

Performance mode (default)

- The server tries to use a persistent `roslyn-cli serve` by default to avoid cold starts.
- To opt-out (one-shot per request), set `ROSLYN_CLI_MODE=oneshot` (or `off`).

## LLM Optimization Principles

- Prefer small responses: enable paging and set conservative limits.
- Use snippets: avoid full file reads; favor short context windows (1–2 lines).
- Scope aggressively: restrict by `Assets/` or `Packages/`, kind, and exact names.
- Favor summaries: rely on tool-side summarized payloads where available.
- Avoid previews unless necessary: apply directly when safe to reduce payload.
- Keep image/video resolutions minimal and avoid base64 unless immediately analyzed.

Suggested caps
- Search: `pageSize≤20`, `maxBytes≤64KB`, `snippetContext=1–2`, `maxMatchesPerFile≤5`.
- Hierarchy: `nameOnly=true`, `maxObjects 100–500` (details: 10–50).
- Script read: 30–40 lines around the target; set `maxBytes`.
- Structured edits: responses are summarized (errors ≤30, message ≤200 chars; large text ≤1000 chars).

## Safe Structured Edit Playbook

1) Locate symbols: `script_symbols_get` or `script_symbol_find` (prefer `kind` and `exact`).
   - Use project-relative paths under `Assets/` or `Packages/` only.
   - Use results’ container to build `namePath` like `Outer/Nested/Member`.
2) Inspect minimal code: `script_read` with 30–40 lines around the symbol.
3) Edit safely: `script_edit_structured` (insert_before/insert_after/replace_body).
   - Insert targets class/namespace (never method).
   - `replace_body` must include braces and be self-contained.
   - Use `preview=true` only when risk is high; otherwise apply to avoid extra tokens.
4) Optional refactor/remove: `script_refactor_rename`, `script_remove_symbol` with preflight.
5) Verify: compile state and, if needed, targeted `script_read` again.

## What It Can Do

- Editor automation: create/modify scenes, GameObjects, components, prefabs, materials
- UI automation: locate and interact with UI, validate UI state
- Input simulation: keyboard/mouse/gamepad/touch for playmode testing (Input System only)
- Visual capture: deterministic screenshots from Game/Scene/Explorer/Window views, optional analysis
- Code base awareness: safe structured edits and accurate symbol/search powered by external Roslyn CLI
- Project control: read/update selected project/editor settings; read logs, monitor compilation

## Unity–MCP Connection

- Host/Port: Unity package opens a TCP server on `UNITY_HOST`/`UNITY_PORT` (default `localhost:6400`).
- Flow: Open Unity project → package starts listening → your MCP client launches the Node server → Node connects to Unity.
- Config: See Configuration section (`project.root`, `project.codeIndexRoot`, `UNITY_MCP_CONFIG`).
- Timeouts/Retry: Exponential backoff with `reconnectDelay`/`maxReconnectDelay`/`reconnectBackoffMultiplier`.
- Troubleshooting: Ensure Unity is running, port 6400 is free, and host/port match.

Architecture

```
┌────────────────┐        JSON-RPC (MCP)        ┌──────────────────────┐
│  MCP Client    │ ───────────────────────────▶ │  Node MCP Server     │
│ (Claude/Codex/ │ ◀─────────────────────────── │ (@akiojin/unity-     │
│   Cursor …)    │        tool responses        │ editor-mcp)          │
└────────────────┘                              └──────────┬───────────┘
                                                         TCP│6400
                                                            ▼
                                                   ┌───────────────────┐
                                                   │  Unity Editor     │
                                                   │  (Package opens   │
                                                   │   TCP listener)   │
                                                   └───────────────────┘
```

Sequence

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Node as MCP Server (Node)
    participant Unity as Unity Editor

    Client->>Node: Connect / request (tool call)
    Node->>Unity: JSON-RPC over TCP (command)
    Unity-->>Node: Result / progress / logs
    Node-->>Client: Response
    alt Disconnect / timeout
        Node->>Node: Exponential backoff
        Node->>Unity: Reconnect
    end
```

## Directory Structure

- `UnityEditorMCP/`: Unity project (Editor bridge, tools, samples)
- `mcp-server/`: Node.js MCP server that exposes Unity tools
- `scripts/`: Helper scripts for local development

## Setup

- Unity 2020.3 LTS or newer
- Node.js 18+ and npm
- Claude Desktop or another MCP-compatible client

Installation
- In Unity: Package Manager → Add from git URL → `https://github.com/akiojin/unity-editor-mcp.git?path=UnityEditorMCP/Packages/unity-editor-mcp`
- Configure MCP client (Claude Desktop example):
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`
  - Add:
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

Usage Flow
- Open Unity project (TCP listener starts on port 6400)
- Start your MCP client and call tools (e.g., ping, scene, script tools)

### Configuration (.unity/config.json)

Configuration is optional; defaults work without any config. When present, the server loads configuration in this order:

- `UNITY_MCP_CONFIG` (absolute path to a JSON file)
- `./.unity/config.json` (relative to the current working directory)
- `~/.unity/config.json` (user-global)

Notes:
- Paths are used as-is. Relative paths resolve from the server process current working directory (not the config file location).
- `~` and environment variable expansion are not applied to path values.

Common keys:
- `project.root`: Unity project root directory (contains `Assets/`).
- `project.codeIndexRoot`: Code Index output directory (default: `<project.root>/Library/UnityMCP/CodeIndex`).

Examples:

```json
{
  "project": {
    "root": "/absolute/path/to/UnityProject",
    "codeIndexRoot": "/absolute/path/to/UnityProject/Library/UnityMCP/CodeIndex"
  }
}
```

Team-friendly (relative) example — ensure you always start the server from the repository root so `process.cwd()` is stable:

```json
{
  "project": {
    "root": ".",
    "codeIndexRoot": "./Library/UnityMCP/CodeIndex"
  }
}
```

Tip: To avoid CWD dependency, prefer `UNITY_MCP_CONFIG=/absolute/path/to/config.json` when launching the server.

#### Configuration Keys

| Key | Type | Default | Description | Allowed values |
| --- | --- | --- | --- | --- |
| `project.root` | string | auto-detect (Unity connection or nearest directory with `Assets/`) | Unity project root directory. Relative paths resolve from process CWD. | — |
| `project.codeIndexRoot` | string | `<project.root>/Library/UnityMCP/CodeIndex` | Code Index storage root. | — |
| `unity.host` | string | `process.env.UNITY_HOST` or `localhost` | Hostname/IP of Unity Editor TCP server. | — |
| `unity.port` | number | `process.env.UNITY_PORT` or `6400` | Port of Unity Editor TCP server. | — |
| `unity.reconnectDelay` | number (ms) | `1000` | Initial delay before reconnect attempts. | — |
| `unity.maxReconnectDelay` | number (ms) | `30000` | Maximum backoff delay between reconnect attempts. | — |
| `unity.reconnectBackoffMultiplier` | number | `2` | Exponential backoff multiplier for reconnects. | — |
| `unity.commandTimeout` | number (ms) | `30000` | Timeout for individual Unity commands. | — |
| `server.name` | string | `unity-editor-mcp-server` | Server name exposed via MCP. | — |
| `server.version` | string | `0.1.0` | Server version string. | — |
| `server.description` | string | `MCP server for Unity Editor integration` | Human-readable description. | — |
| `logging.level` | string | `process.env.LOG_LEVEL` or `info` | Log verbosity for stderr logging. | `debug` | `info` | `warn` |
| `logging.prefix` | string | `[Unity Editor MCP]` | Log prefix used in stderr. | — |
| `search.defaultDetail` | string | `process.env.SEARCH_DEFAULT_DETAIL` or `compact` | Default return detail for search; `compact` maps to `snippets`. | `compact` | `metadata` | `snippets` | `full` |
| `search.engine` | string | `process.env.SEARCH_ENGINE` or `naive` | Search engine implementation. | `naive` (treesitter planned) |

### GUID DB

- Storage root: Stored under your workspace at `./.unity/guid-db/`.
- Version control: Commit `./.unity/guid-db/` to your VCS so history is preserved.

## Screenshot System

- Capture Game View, Scene View, Explorer（AI-framed）, or a specific Editor window.
- Modes: `game` | `scene` | `explorer` | `window`.
- Options:
  - Resolution: `width`/`height` (or in explorer: `camera.width`/`camera.height`).
  - UI Overlay: `includeUI` for Game View.
  - Explorer framing: `explorerSettings.camera.*` (autoFrame, FOV, near/far clip, position/rotation, padding).
  - Display aids: `explorerSettings.display.*` (highlightTarget, showBounds, showColliders, showGizmos, backgroundColor, layers).
  - Target focus: `explorerSettings.target.*` (gameObject/tag/area/position, includeChildren).
  - Output: `outputPath` to save under `Assets/` or return base64 data.
- Analysis: optional UI detection and content summary.

Sequence

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Node as MCP Server (Node)
    participant Unity as Unity Editor

    Client->>Node: Request screenshot (mode/options)
    Node->>Unity: Capture command with parameters
    Unity->>Unity: Configure camera/render settings
    Unity-->>Node: Image data (file path or base64)
    Node-->>Client: Return result (and optional analysis)
```

## Input Simulation

- Supported: Unity Input System only (new Input System package).
- Not supported: Legacy Input Manager (Project Settings → Input Manager).
- Capabilities: simulate keyboard, mouse, gamepad, and touch input for playmode testing and UI interaction.
- Tip: Ensure your project uses Input System; otherwise simulated input will not affect gameplay.

## C# Editing Backend (Roslyn CLI)

`roslyn-cli` loads your `.sln/.csproj` via Roslyn/MSBuildWorkspace and exposes:
`find-symbol`, `find-references`, `replace-symbol-body`, `insert-before-symbol`, `insert-after-symbol`, `rename-symbol`.
All `script_*` tools call this CLI under the hood.
- Triggers: Asset refresh, compilation complete, script edits applied.

### Code Index & Analysis (How it works)

This project does not persist a JSON index anymore. Instead, it performs on-demand, authoritative analysis through Roslyn when you call `script_*` tools.

- Separation of concerns
  - Unity: editor-side automation only. No C# parsing in the Editor domain.
  - Node: delegates C# analysis/edits to the external `roslyn-cli` (loads `.sln/.csproj`).

- What the CLI builds internally
  - Solution/Project graph with MSBuildWorkspace.
  - Syntax trees + SemanticModel via Roslyn compilations.
  - Symbol model (type/member with namespace/container, and their spans).

- Operations flow
  1) MCP tool called (e.g., `script_symbol_find`).
  2) Server spawns `roslyn-cli ...` for the specific action.
  3) CLI returns JSON with `{ path, name, kind, line, column, container, ns }` or edit results.
  4) For edits: preflight compile (in-memory) → if errors, block; if clean, apply workspace changes atomically.
  5) Unity `AssetDatabase.Refresh` is manual and only needed when you want the Editor to reload scripts.

- Safety guarantees
  - Structured edits only (body replace, insert before/after, semantic rename).
  - Preflight compilation blocks error-inducing changes.
  - No blind line-based replacements.

- Performance
  - On-demand analysis has a cold-start cost (solution load) but avoids Unity domain reload issues.
  - You can prebuild self-contained CLI binaries (see CI workflow) to speed up environments.

- Limitations
  - Unsaved buffers are not considered (CLI reads from disk). Save files before running tools.
  - `namePath` like `OuterType/InnerType/Method` resolves nested types/members.

Sequence

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Node as MCP Server (Index/Tools)
    participant Unity as Unity Editor
    participant Index as Code Index

    Client->>Node: Edit or search request
    alt Edit flow
        Node->>Unity: Apply changes
        Unity->>Unity: Refresh / compile
        Node->>Index: Re-index changed files (write JSON)
    else Search flow
        Node->>Index: Load symbols if present
        Index-->>Node: Symbols / metadata
        Node->>Node: Fallback parse if missing
    end
    Node-->>Client: Result (edits confirmed or search hits)
```

 

## Other Clients

### Codex CLI

Configure MCP servers for Codex by creating a config file:

- macOS/Linux: `~/.codex/servers.json`
- Windows: `%USERPROFILE%\.codex\servers.json`

Example:

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

## Troubleshooting (Short)

- Unity TCP not listening: reopen project; ensure port 6400 is free.
- Node.js cannot connect: Unity running? firewall? logs in Unity/Node terminals.
- C# types missing: refresh assets and wait until compilation completes.
- Technical notes are summarized in this README.

Note: This README now consolidates connection design, screenshot system, and code index specifications.
