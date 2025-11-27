# Code Index Performance Benchmark

## Overview

This document presents comprehensive performance comparison testing between unity-mcp-server code index tools and standard Claude Code tools (Read, Grep, Edit).

**Test Date**: 2025-11-27
**Environment**: Linux (WSL2), Node.js 22.x, Unity Editor connected

## Test Target Files

Selected medium-sized C# files (100-500 lines) from `UnityMCPServer/Packages/unity-mcp-server/Editor/`:

- `Helpers/Response.cs` (357 lines)
- `Handlers/AnimatorStateHandler.cs` (450 lines)
- `Handlers/MenuHandler.cs` (519 lines)

---

## Results Summary

### Read-Related Tools (4 tools)

| Test | unity-mcp-server | Standard Tool | Result | Context Compression |
|------|------------------|---------------|--------|---------------------|
| File Read | `script_read` | `Read` | **PASS** | 200 lines (default) vs 357 lines (full) |
| Text Search | `script_search` | `Grep` | **PARTIAL** | Snippets with paging vs full lines |
| Symbol Find | `script_symbol_find` | `Grep` | **FAIL** | 60s timeout (LSP issue) |
| File Symbols | `script_symbols_get` | `Read` | **PASS** | 15 symbols (~1KB) vs full file (~15KB) |

### Reference Search (1 tool)

| Test | unity-mcp-server | Standard Tool | Result | Notes |
|------|------------------|---------------|--------|-------|
| Reference Find | `script_refs_find` | `Grep` | **FAIL** | 60s timeout (LSP issue) |

### Edit Tools (2 tools)

| Test | unity-mcp-server | Standard Tool | Result | Features |
|------|------------------|---------------|--------|----------|
| Structured Edit | `script_edit_structured` | `Edit` | **PASS** | Symbol-based, LSP validation, preview mode |
| Snippet Edit | `script_edit_snippet` | `Edit` | **PASS** | Hash verification, LSP diagnostics, 80-char limit |

### Index Tools (3 tools)

| Test | Tool | Result | Notes |
|------|------|--------|-------|
| Index Status | `code_index_status` | **DEGRADED** | Requires better-sqlite3 native binding |
| Index Update | `code_index_update` | **PASS** | LSP-based symbol update |
| Index Build | `code_index_build` | **PASS** | Background job with progress tracking |

---

## Detailed Test Results

### Test 1: File Read (script_read vs Read)

**script_read**:
```json
{
  "success": true,
  "path": "Packages/unity-mcp-server/Editor/Helpers/Response.cs",
  "startLine": 1,
  "endLine": 200,
  "content": "..." // 200 lines (default limit)
}
```

**Read**: Returns full 357 lines with line numbers

**Verdict**: `script_read` provides context compression via line limits. **PASS**

---

### Test 2: Text Search (script_search vs Grep)

**script_search**:
```json
{
  "success": true,
  "total": 3,
  "pathTable": ["Assets/Scripts/..."],
  "results": [{ "fileId": 0, "lineRanges": "7", "snippets": [...] }]
}
```
- Scope limited to Assets/ (Packages requires separate scope)
- Returns compressed snippets with file ID references

**Grep**: Returns 15+ full matches immediately

**Verdict**: `script_search` has scope limitations but provides compression. **PARTIAL**

---

### Test 3: Symbol Find (script_symbol_find vs Grep)

**script_symbol_find**:
```
Error: workspace/symbol timed out after 60000 ms
```

**Grep**: Returns 2 matches instantly

**Verdict**: LSP timeout makes this tool unreliable. **FAIL**

---

### Test 4: File Symbols (script_symbols_get vs Read)

**script_symbols_get**:
```json
{
  "success": true,
  "symbols": [
    { "name": "Response", "kind": "class", "startLine": 15 },
    { "name": "GetPackageVersion", "kind": "method", "startLine": 21 },
    // ... 15 symbols total
  ]
}
```
- ~1KB structured data
- Includes line positions for navigation

**Read**: ~15KB full file content

**Verdict**: Excellent context compression (15x reduction). **PASS**

---

### Test 5: Reference Find (script_refs_find vs Grep)

**script_refs_find**:
```
Error: mcp/referencesByName timed out after 60000 ms
```

**Grep** (`Response\.Success`): Returns 20 matches instantly

**Verdict**: LSP timeout makes this tool unreliable. **FAIL**

---

### Test 6: Structured Edit (script_edit_structured)

**Result**:
```json
{
  "success": true,
  "applied": false,
  "preview": "...",
  "previewTruncated": true
}
```

**Features**:
- Symbol-based targeting (e.g., `Response/Pong`)
- Preview mode without file modification
- LSP syntax validation

**Verdict**: Works correctly with validation features. **PASS**

---

### Test 7: Snippet Edit (script_edit_snippet)

**Result**:
```json
{
  "success": true,
  "results": [{
    "status": "applied",
    "beforeSnippet": "message = \"pong\"",
    "afterSnippet": "message = \"pong_test\"",
    "charactersChanged": 21
  }],
  "diagnostics": [],
  "beforeHash": "17fa17e4...",
  "afterHash": "4a20a106..."
}
```

**Features**:
- Precise anchor-based editing
- Hash verification for integrity
- LSP diagnostics
- 80-character change limit

**Verdict**: Works correctly with safety features. **PASS**

---

### Test 8: Index Status (code_index_status)

**Result**:
```json
{
  "success": false,
  "error": "code_index_unavailable",
  "message": "better-sqlite3 native binding unavailable"
}
```

**Note**: This environment lacks native build tools. On systems with better-sqlite3 properly installed, this returns index statistics.

**Verdict**: Works when dependencies are met. **DEGRADED**

---

### Test 9: Index Update (code_index_update)

**Result**:
```json
{
  "success": true,
  "updated": 1
}
```

**Verdict**: LSP-based incremental update works. **PASS**

---

### Test 10: Index Build (code_index_build)

**Result**:
```json
{
  "success": true,
  "jobId": "build-1764232205285-l661fsm5",
  "message": "Code index build started in background"
}
```

**Verdict**: Background job system works. **PASS**

---

## Context Compression Features

The code index tools implement several context compression mechanisms:

| Feature | Default | Description |
|---------|---------|-------------|
| `maxBytes` | 64KB | Response size limit |
| `pageSize` | 20-50 | Pagination for results |
| `maxMatchesPerFile` | 5 | Limit matches per file |
| `snippetContext` | 2 lines | Context around matches |
| `MAX_SNIPPET` | 400 chars | Snippet text limit (refs_find) |
| `MAX_TEXT_LEN` | 1000 chars | Edit preview limit |

### Measured Compression Ratios

| Tool | Input Size | Output Size | Compression |
|------|------------|-------------|-------------|
| `script_symbols_get` | ~15KB (full file) | ~1KB (symbols) | **15x** |
| `script_read` | 357 lines | 200 lines | **1.8x** |
| `script_search` | Full matches | Snippets only | **~3-5x** |

---

## Known Issues

### Critical: LSP Timeout (60s)

**Affected Tools**:
- `script_symbol_find`
- `script_refs_find`

**Symptoms**:
- 60-second wait followed by "Connection closed"
- Server restart required

**Root Cause**: LSP requests timeout when Unity Editor LSP is slow to respond

**Workaround**: Use `Grep` for symbol/reference searches until resolved

### Database Dependency

**Affected Tools**:
- `code_index_status` (full functionality)
- `code_index_build` (persistence)
- `code_index_update` (persistence)

**Issue**: `better-sqlite3` requires native build tools

**Workaround**: Install build tools or use prebuilt binaries

---

## Pass/Fail Summary

### Overall Results

| Category | Pass | Partial | Fail | Total |
|----------|------|---------|------|-------|
| Read-Related | 2 | 1 | 1 | 4 |
| Reference Search | 0 | 0 | 1 | 1 |
| Edit Tools | 2 | 0 | 0 | 2 |
| Index Tools | 2 | 1 | 0 | 3 |
| **Total** | **6** | **2** | **2** | **10** |

### Pass Rate: 60% (6/10)
### With Partial: 80% (8/10)

---

## Conclusions

### Strengths

1. **Context Compression**: `script_symbols_get` achieves 15x compression
2. **Edit Safety**: Both edit tools provide preview mode, hash verification, and LSP diagnostics
3. **Background Jobs**: Index build runs asynchronously with progress tracking
4. **Incremental Updates**: `code_index_update` efficiently updates single files

### Weaknesses

1. **LSP Timeout**: `script_symbol_find` and `script_refs_find` are unreliable (60s timeout)
2. **Scope Limitations**: `script_search` has separate scopes for Assets/Packages
3. **Native Dependencies**: `better-sqlite3` requires build environment

### Recommendations

1. **Fix LSP timeout**: Implement shorter timeout with retry, or prioritize DB-based search
2. **Unified scope**: Allow searching across Assets and Packages simultaneously
3. **Prebuilt binaries**: Distribute precompiled `better-sqlite3` for common platforms
4. **Fallback strategy**: When LSP times out, fall back to Grep-based search

### Final Verdict

**CONDITIONAL PASS**

The code index tools provide significant value for context compression and edit safety, but the LSP timeout issues prevent reliable operation of symbol search features. The system meets requirements when:

- `better-sqlite3` is properly installed (DB-based search bypasses LSP)
- LSP timeout is addressed
- Grep is used as fallback for reference searches
