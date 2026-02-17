---
name: unity-cli-usage
description: Workflow guide for using unity-cli (Rust) to call Unity TCP commands, including raw command fallback, scene operations, and instance switching.
---

# unity-cli Usage

Use this skill when you need to operate Unity via `unity-cli` instead of MCP server startup.

## Core Rules

- Prefer subcommands for common tasks (`system`, `scene`, `instances`).
- Use `raw <tool> --json {...}` when a dedicated subcommand is unavailable.
- Use `--output json` when downstream tools parse results.

## Common Workflows

### 1) Connectivity check

```bash
unity-cli system ping
```

### 2) Scene creation

```bash
unity-cli scene create SampleScene --path Assets/Scenes/ --load-scene true
```

### 3) Generic command call (108-tool compatible)

```bash
unity-cli raw create_gameobject --json '{"name":"Cube"}'
```

### 4) Multi-instance safety

```bash
unity-cli instances list --ports 6400,6401
unity-cli instances set-active localhost:6401
```

## Parameter Rules

- `--json` must be a JSON object.
- Prefer explicit booleans in JSON payloads.
- For complex payloads, use `--params-file <file>`.

## Environment

- `UNITY_CLI_HOST`, `UNITY_CLI_PORT`, `UNITY_CLI_TIMEOUT_MS`
- Backward-compatible fallback: `UNITY_MCP_MCP_HOST`, `UNITY_MCP_PORT`
