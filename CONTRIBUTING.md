# Contributing to Unity MCP Server

English | [日本語](#日本語)

Thank you for your interest in contributing to Unity MCP Server! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Git Workflow](#git-workflow)
- [Commit Message Format](#commit-message-format)
- [Git Hooks (Husky)](#git-hooks-husky)
- [Test-Driven Development (TDD)](#test-driven-development-tdd)
- [Pull Request Process](#pull-request-process)
- [Code Guidelines](#code-guidelines)

## Development Setup

### Prerequisites

- Unity 2020.3 LTS or newer
- Node.js 18.x / 20.x / 22.x LTS (23+ not supported)
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/akiojin/unity-mcp-server.git
cd unity-mcp-server

# Enable Corepack (recommended) or install pnpm manually
corepack enable
# corepack prepare pnpm@9.15.4 --activate

# Install dependencies (pnpm is required; see packageManager in package.json)
pnpm install --frozen-lockfile

# Run tests
pnpm -C mcp-server test

# Verify installation
node mcp-server/bin/unity-mcp-server --version
```

### Developer Setup (C# LSP)

End users do not need .NET. The MCP server auto-provisions a self-contained C# LSP by tag. As a contributor, you can build it locally if needed:

```bash
# Requires .NET 9 SDK
dotnet publish csharp-lsp/Server.csproj -c Release -r <rid> --self-contained true -p:PublishSingleFile=true -o out/<rid>

# Copy to tools directory
cp out/<rid>/server ~/.unity/tools/csharp-lsp/<rid>/server
```

## Git Workflow

This project follows a **feature branch workflow** with `develop` as the integration branch:

### Branch Naming

| Pattern | Purpose |
|---------|---------|
| `feature/*` | New features |
| `bugfix/*` | Bug fixes |
| `hotfix/*` | Critical fixes |

### Workflow

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. Make changes following TDD (tests first)

3. Commit using Conventional Commits format

4. Push and create a Pull Request to `develop`

## Commit Message Format

This project uses **Conventional Commits** for automated versioning and changelog generation:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types and Version Impact

| Type | Description | Version Impact |
|------|-------------|----------------|
| `feat` | New feature | Minor (2.16.3 → 2.17.0) |
| `fix` | Bug fix | Patch (2.16.3 → 2.16.4) |
| `perf` | Performance improvement | Patch |
| `docs` | Documentation only | None |
| `style` | Code style (formatting) | None |
| `refactor` | Code refactoring | None |
| `test` | Tests | None |
| `chore` | Build/tooling | None |
| `ci` | CI configuration | None |

### Breaking Changes

Use either method:

```bash
# Method 1: Footer
git commit -m "feat: change API signature

BREAKING CHANGE: captureScreenshot now requires workspaceRoot parameter"

# Method 2: ! suffix
git commit -m "feat!: remove deprecated API"
```

### Examples

```bash
# Good examples
git commit -m "feat(screenshot): add explorer mode capture"
git commit -m "fix(connection): resolve timeout issue"
git commit -m "docs: update installation instructions"
git commit -m "test(script): add refs_find tests"

# Bad examples
git commit -m "Update hooks"           # Missing type
git commit -m "feat: change files"     # Too vague
git commit -m "fix stuff"              # Non-descriptive
```

## Git Hooks (Husky)

This project uses [Husky](https://typicode.github.io/husky/) to enforce code quality:

### Active Hooks

| Hook | Action |
|------|--------|
| `commit-msg` | Validates Conventional Commits format (commitlint) |
| `pre-commit` | Runs ESLint, Prettier, markdownlint on staged files |
| `pre-push` | Executes test suite before pushing |
| `post-merge` | Notifies when dependencies need updating |

### Configuration Files

| File | Purpose |
|------|---------|
| `.commitlintrc.json` | Conventional Commits rules |
| `.eslintrc.json` | JavaScript code style |
| `.prettierrc.json` | Code formatting |
| `.markdownlint.json` | Markdown rules |

### Bypassing Hooks (Emergency Only)

```bash
git commit --no-verify -m "emergency fix"
git push --no-verify
```

**Warning**: Use sparingly. Hooks prevent CI failures and maintain code quality.

## Test-Driven Development (TDD)

This project **strictly enforces TDD**:

### Red-Green-Refactor Cycle

1. **RED**: Write a failing test first
2. **GREEN**: Write minimal code to pass the test
3. **REFACTOR**: Clean up while keeping tests green

### Test Categories

| Category | Coverage Requirement |
|----------|---------------------|
| Unit tests | 80%+ coverage |
| Integration tests | 100% critical paths |
| E2E tests | Major user workflows |

### Running Tests

```bash
# All tests
npm test --workspace=mcp-server

# With coverage
npm run test:coverage --workspace=mcp-server

# Watch mode
npm run test:watch --workspace=mcp-server

# Specific file
npm test --workspace=mcp-server -- tests/unit/handlers/script/ScriptRefsFindToolHandler.test.js
```

## Pull Request Process

### Before Creating PR

- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] Commit messages follow Conventional Commits
- [ ] Documentation updated if needed

### PR Requirements

- **Target**: `develop` branch (never `main` directly)
- **Title**: Clear description of changes
- **Description**: What changed and why

### Required CI Checks

| Check | Description |
|-------|-------------|
| `Test & Coverage` | All tests pass |
| `Markdown, ESLint & Formatting` | Code style validation |
| `Commit Message Lint` | Conventional Commits format |
| `Package` | npm package builds successfully |

### Review Process

1. At least one approval required
2. All CI checks must pass
3. No merge conflicts

## Code Guidelines

### JavaScript/TypeScript

- Use ES6+ features
- Follow ESLint configuration
- Format with Prettier
- Add JSDoc comments for public APIs
- No `console.log` in production code

### Unity C#

- Follow Unity's coding conventions
- Add XML documentation for public methods
- Use meaningful names
- Handle exceptions appropriately

### Markdown

- Follow markdownlint rules
- Use fenced code blocks with language
- Keep line length reasonable

## Reporting Issues

- Use GitHub Issues for bugs and features
- Include Unity version and OS
- Provide reproduction steps for bugs
- Include relevant error logs

## Questions?

Feel free to open an issue for any questions!

---

# 日本語

## Unity MCP Server への貢献

Unity MCP Server への貢献にご興味を持っていただきありがとうございます。

### 開発環境セットアップ

```bash
git clone https://github.com/akiojin/unity-mcp-server.git
cd unity-mcp-server
npm ci --workspace=mcp-server
npm test --workspace=mcp-server
```

### コミットメッセージ形式

**Conventional Commits** を使用：

| タイプ | 説明 | バージョン影響 |
|--------|------|----------------|
| `feat` | 新機能 | マイナー ↑ |
| `fix` | バグ修正 | パッチ ↑ |
| `docs` | ドキュメント | なし |
| `test` | テスト | なし |

### Gitフック

| フック | アクション |
|--------|----------|
| `commit-msg` | Conventional Commits検証 |
| `pre-commit` | ESLint/Prettier実行 |
| `pre-push` | テスト実行 |

### TDD（必須）

1. **RED**: テストを先に書く（失敗を確認）
2. **GREEN**: テストを通す最小限のコード
3. **REFACTOR**: リファクタリング

### PRプロセス

- 対象: `develop`ブランチ
- 全テスト通過必須
- CIチェック通過必須

詳細は [docs/development.md](docs/development.md) を参照してください。
