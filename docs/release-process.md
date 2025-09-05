# Release Process (MCP + C# LSP + Unity)

## Overview
- Versions for MCP server, C# LSP, and Unity sample are synchronized.
- `scripts/publish.sh` updates versions together and creates release tags.
- GitHub Actions publish both the MCP server package and the LSP binaries.

## Steps
- Update changelog and confirm tests/docs are up to date.
- Run `scripts/publish.sh` (CI will build and attach LSP artifacts per RID).
- Verify the release artifacts and NPM publish succeeded.

## CI Workflows
- `.github/workflows/release-csharp-lsp.yml`: builds `csharp-lsp` for supported RIDs, generates a manifest.
- `.github/workflows/mcp-server-publish.yml`: publishes the MCP server and checks the LSP manifest availability.

## Post-Release
- MCP clients auto-download the matching LSP on first use.
- No user install scripts required.

## Legacy Cleanup (roslyn-cli)
- If old roslyn-cli assets remain on GitHub Releases, remove them without deleting the releases:
  - Prereq: `gh` CLI authenticated, `jq` installed.
  - Dry-run:
    - `REPO="<owner>/<repo>" DRY_RUN=1 ./scripts/cleanup-roslyn-assets.sh`
  - Apply:
    - `REPO="<owner>/<repo>" DRY_RUN=0 ./scripts/cleanup-roslyn-assets.sh`
- The script deletes only assets whose names match `roslyn-cli` (case-insensitive). Releases and tags are preserved.
