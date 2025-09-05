# C# LSP Operations: Auto-Download, Auto-Update, Recovery

- Managed by the MCP server. Users do not install the .NET SDK.
- The LSP binary version is pinned to the MCP server version and auto-fetched per RID.

## Auto-Download
- On first use, the MCP spawns `csharp-lsp` via `LspProcessManager`.
- If the binary is missing, `CSharpLspUtils.autoDownload()` downloads it for the current runtime identifier (RID) and stores it under `mcp-server/bin/`.
- The download manifest is produced by CI during the LSP release.

## Auto-Update
- When MCP version changes, it expects a matching LSP version.
- If a mismatch is detected, the client re-downloads the matching LSP package.
- Index and cache are preserved; only the executable is refreshed.

## Recovery
- If the LSP process exits unexpectedly, `LspRpcClient` rejects all pending requests and re-initializes on the next request.
- If a download is corrupted:
  - Delete `mcp-server/bin/csharp-lsp*` and retry the operation; the client re-downloads.
- If repeated failures occur:
  - Check logs under MCP server output; verify network is reachable for the download.

## Configuration
- Controlled via `mcp-server/src/core/config.js`:
  - `lsp.requestTimeoutMs`: per-request timeout.
  - `lsp.autoDownload`: enable/disable auto-download (default: true).
  - `indexing.*`: controls incremental indexing cadence and behavior.

## Security Notes
- Downloads are from release artifacts published by CI.
- Each binary is verified with a manifest-provided SHA-256 checksum before install. On mismatch, the file is deleted and the operation fails with an English error.
- Future: consider artifact signing and additional verification hardening.

## Logging
- All hints and error messages are emitted in English.
- LSP request/response errors include concise messages (≤ 200 chars) and capped lists.
