# Development Guide

English | [日本語](#日本語)

This document contains internal development details for Unity MCP Server maintainers and contributors.

## Table of Contents

- [Spec Kit (SDD) Conventions](#spec-kit-sdd-conventions)
- [C# Editing Policy](#c-editing-policy)
- [Automated Release Management](#automated-release-management)
- [Release Process](#release-process)
- [LLM Optimization Principles](#llm-optimization-principles)

## Spec Kit (SDD) Conventions

This project uses Spec-Driven Development (SDD) with Spec Kit v0.0.78.

### Directory Structure

```
.specify/
├── scripts/       # Bash scripts for workflow automation
├── templates/     # Japanese-localized spec templates
└── memory/        # Constitution mirror (source: docs/constitution.md)
specs/
└── SPEC-[uuid8]/  # Feature specifications
    ├── spec.md    # Requirements specification
    ├── plan.md    # Implementation plan
    └── tasks.md   # Task breakdown
```

### Feature ID Format

- Pattern: `SPEC-[0-9a-f]{8}` (e.g., `SPEC-1a2b3c4d`)
- Generated: Random 8-character hex string
- Storage: `.specify/current-feature` tracks active feature

### Commands

```bash
# Verify Spec Kit and templates
uvx --from git+https://github.com/github/spec-kit.git specify check

# Feature workflow
/speckit.specify  # Create specification
/speckit.plan     # Create implementation plan
/speckit.tasks    # Generate task breakdown
```

### Template Customization

Templates are localized to Japanese. Edit `/.specify/templates/*.md` to update.

### Legacy Support

Legacy wrappers in `scripts/` delegate to `.specify/scripts/bash/` for backward compatibility.

## C# Editing Policy

All C# symbol/search/structured edits are performed via a self-contained C# Language Server (LSP) bundled in this repo. Unity communication is not required for code editing.

### Architecture

```
MCP Client → Node MCP Server → C# LSP (Roslyn) → File System
                    ↓
              Unity Editor (optional, for refresh)
```

### Key Points

- `script_*` tools call the LSP under the hood
- Edits are robust to Unity compilation/domain reload
- Risky line-based patch/pattern replace tools were removed
- LSP is auto-provisioned (fixed version by tag)
- No .NET SDK required for end users

### Tool Usage

```javascript
// Symbol search
script_symbol_find { "name": "ClassName", "kind": "class" }

// Reference search
script_refs_find { "name": "MethodName" }

// Method body replacement (preflight → apply)
script_edit_structured {
  "operation": "replace_body",
  "path": "Packages/.../File.cs",
  "symbolName": "Class/Method",
  "newText": "{ /* ... */ }",
  "preview": true  // then false to apply
}

// Class insertion
script_edit_structured {
  "operation": "insert_after",
  "path": "...",
  "symbolName": "ClassName",
  "kind": "class",
  "newText": "\nprivate void X(){}\n"
}

// Snippet editing (≤80 chars)
script_edit_snippet {
  "path": "Assets/Scripts/Foo.cs",
  "instructions": [{
    "operation": "delete",
    "anchor": { "type": "text", "target": "if (value == null) return;\n" }
  }]
}
```

### Recovery

If LSP exits unexpectedly, the client auto-retries once. For corrupted downloads, delete `mcp-server/bin/csharp-lsp*` and retry.

## Automated Release Management

This project uses **release-please (manifest mode)** + GitHub Actions for automated releases.

### Workflow Overview

```
feature branch → develop → main → tag → publish
```

1. **Feature → develop**: PR with Conventional Commits, auto-merge on CI pass
2. **Create Release Branch** (manual): release-please opens release PR to `main`
3. **Release** (main merge): release-please tags `vX.Y.Z`, creates GitHub Release
4. **Publish** (tag trigger): Build csharp-lsp, npm publish, backmerge to `develop` (OpenUPM is tag auto-detection; signing currently disabled)

### Version Scope

- `mcp-server/package.json`
- Unity package via extra-files

### Required CI Checks

- `Test & Coverage`
- `Markdown, ESLint & Formatting`
- `Commit Message Lint`
- `Package`

## Release Process

### Automated Flow (release-please)

1. **Feature → develop**
   - Work on `feature/SPEC-xxxxxxxx` with Conventional Commits
   - Create PR to `develop` (e.g., `gh pr create --base develop`) → auto-merge on CI pass

2. **Release PR (manual trigger)**
   - Run `Create Release Branch` Action
   - release-please generates release PR to `main`

3. **Tag & GitHub Release**
   - Merge to `main` triggers `Release` workflow
   - release-please tags `vX.Y.Z` and creates GitHub Release

4. **Publish (tag trigger)**
   - `Publish` workflow builds csharp-lsp for all platforms
   - npm publish `mcp-server`
   - OpenUPM distribution is handled by tag auto-detection (unsigned)
   - Backmerge `main` → `develop`

#### OpenUPM signing note

- Signed UPM distribution (Unity 6.3+ `.attestation.p7m`) is currently postponed/disabled.

### Commit Message Format

| Type | Version Impact |
|------|----------------|
| `feat:` | Minor (2.16.3 → 2.17.0) |
| `fix:` | Patch (2.16.3 → 2.16.4) |
| `feat!:` / `BREAKING CHANGE:` | Major (2.16.3 → 3.0.0) |
| `chore:`, `docs:`, `test:` | No version bump |

### Manual Release (if needed)

1. Go to Actions tab on GitHub
2. Select "Release" workflow
3. Click "Run workflow" on `main` branch

### Troubleshooting

| Issue | Solution |
|-------|----------|
| No release created | Verify Conventional Commits format |
| csharp-lsp build failed | Rerun `Publish` on the tag |
| Version mismatch | Re-run `Release` to sync extra-files |

### Version Synchronization

- **mcp-server & Unity Package**: release-please (manifest + extra-files)
- **csharp-lsp**: Built on tag `vX.Y.Z`
- **CHANGELOG.md**: Generated by release-please

## LLM Optimization Principles

Guidelines for tool responses to minimize token usage:

### General Principles

- Prefer small responses: enable paging and set conservative limits
- Use snippets: avoid full file reads; favor short context (1-2 lines)
- Scope aggressively: restrict by `Assets/` or `Packages/`, kind, exact names
- Favor summaries: rely on tool-side summarized payloads
- Avoid previews unless necessary: apply directly when safe
- Keep image/video resolutions minimal; avoid base64 unless immediately analyzed

### Recommended Limits

| Tool Type | Recommended Settings |
|-----------|---------------------|
| Search | `pageSize≤20`, `maxBytes≤64KB`, `snippetContext=1-2`, `maxMatchesPerFile≤5` |
| Hierarchy | `nameOnly=true`, `maxObjects 100-500` (details: 10-50) |
| Script read | 30-40 lines around target; set `maxBytes` |
| Structured edits | Responses summarized (errors≤30, message≤200 chars, large text≤1000 chars) |

### Safe Structured Edit Playbook

1. **Locate symbols**: `script_symbols_get` or `script_symbol_find` (use `kind`/`exact`)
   - Use project-relative paths under `Assets/` or `Packages/` only
   - Build `namePath` like `Outer/Nested/Member` from results

2. **Inspect minimal code**: `script_read` with 30-40 lines around symbol

3. **Edit safely**:
   - `script_edit_snippet`: ≤80-char changes with exact text anchors
   - `script_edit_structured`: class/namespace insertions, method body replacements
   - Use `preview=true` only for high-risk edits

4. **Optional refactor**: `script_refactor_rename`, `script_remove_symbol` with preflight

5. **Verify**: Check compile state, re-read if needed

## Claude Code Troubleshooting

### Hookify import error (`No module named 'hookify'`)

If Claude Code shows `Hookify import error: No module named 'hookify'`, the official `hookify` plugin was installed under a versioned directory and its hook scripts fail to resolve the `hookify` package.

Run this helper to patch the plugin hook scripts in your local Claude plugin cache:

```bash
./scripts/fix-hookify-import.sh
```

Note: plugin updates may overwrite the cache. If the error comes back, rerun the script.

---

## 日本語

### 開発ガイド

このドキュメントは Unity MCP Server のメンテナーおよびコントリビューター向けの内部開発詳細を記載しています。

### Spec Kit（SDD）運用

`.specify/` 配下に Spec Kit v0.0.78 が展開されています。

#### フィーチャーID形式

- 形式: `SPEC-[0-9a-f]{8}`（例: `SPEC-1a2b3c4d`）
- `.specify/current-feature` にアクティブIDを記録

#### CLIコマンド

```bash
uvx --from git+https://github.com/github/spec-kit.git specify check
```

### C#編集の方針

C#の探索/参照/構造化編集は、同梱の自己完結C# LSPで行います。

#### 主要ポイント

- `script_*` ツールは内部でLSPを呼び出す
- Unityのコンパイル/ドメインリロードの影響を受けにくい
- 危険な行単位置換は廃止
- LSPは自動ダウンロード・自動更新
- ユーザー側での.NET SDK導入は不要

### 自動リリース管理

**release-please (manifest mode)** + GitHub Actionsで自動リリース。

#### ワークフロー

1. `feature` → `develop`: PR作成→自動マージ
2. リリースPR（手動トリガー）: release-pleaseがmain向けPR作成
3. タグ＆Release: mainマージで`vX.Y.Z`タグ作成
4. Publish: csharp-lspビルド、npm publish（OpenUPM配布はタグ自動検知。署名は現時点で見送り）

#### コミットメッセージとバージョン

| タイプ | バージョン影響 |
|--------|----------------|
| `feat:` | マイナー ↑ |
| `fix:` | パッチ ↑ |
| `feat!:` | メジャー ↑ |
| `chore:`, `docs:` | なし |

### LLM最適化の原則

#### 推奨上限

| ツール種別 | 推奨設定 |
|-----------|---------|
| 検索 | `pageSize≤20`, `maxBytes≤64KB` |
| ヒエラルキー | `nameOnly=true`, `maxObjects 100-500` |
| script_read | 対象の前後30-40行 |

### Claude Code のトラブルシューティング

#### Hookify import error（`No module named 'hookify'`）

Claude Code で `Hookify import error: No module named 'hookify'` が出続ける場合、公式 `hookify` プラグインがバージョン付きディレクトリ配下に展開されており、フックスクリプトが `hookify` パッケージを解決できないのが原因です。

以下を実行して、ローカルの Claude プラグインキャッシュ内のフックスクリプトをパッチしてください:

```bash
./scripts/fix-hookify-import.sh
```

注: プラグイン更新でキャッシュが上書きされることがあります。再発したら再度実行してください。

詳細は [CONTRIBUTING.md](../CONTRIBUTING.md) および [CLAUDE.md](../CLAUDE.md) を参照してください。
