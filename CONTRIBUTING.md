# Contributing to Unity Editor MCP

Thank you for your interest in contributing to Unity Editor MCP! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/unity-editor-mcp.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Unity 2020.3 LTS or newer
- Node.js 18.0.0 or newer
- Git

### Developer Setup (roslyn-cli)

End users do not need .NET. The MCP server auto-provisions `roslyn-cli` when used. As a contributor, if you want to build or provision the CLI manually, use one of the following options:

- Build from source (requires .NET 9 SDK):
  - macOS/Linux: `./scripts/bootstrap-roslyn-cli.sh osx-arm64|osx-x64|linux-x64`
  - Windows: `powershell -ExecutionPolicy Bypass -File scripts/bootstrap-roslyn-cli.ps1 -Rid win-x64`
  - Output: `./.tools/roslyn-cli/<rid>/roslyn-cli(.exe)`

- One-liner installers (no .NET required):
  - UNIX: `curl -fsSL https://raw.githubusercontent.com/akiojin/unity-editor-mcp/main/scripts/install-roslyn-cli.sh | bash -s -- --version <ver> --rid <rid>`
  - PowerShell: `irm https://raw.githubusercontent.com/akiojin/unity-editor-mcp/main/scripts/install-roslyn-cli.ps1 | iex` (e.g., `-Version 2.9.1 -Rid win-x64`)

- npx wrapper (no .NET required):
  - `npx -y @akiojin/roslyn-cli ak-roslyn serve --solution <path>`
  - The first run downloads the proper binary into `./.tools/roslyn-cli/<rid>/` and verifies SHA256.

### Setup Instructions

1. Install dependencies in the mcp-server directory:
   ```bash
   cd mcp-server
   npm install
   ```

2. Install the Unity package in your Unity project (see README.md)

3. Run tests:
   ```bash
   npm test
   ```

## Code Guidelines

### TypeScript/JavaScript

- Use ES6+ features
- Follow the existing code style
- Add JSDoc comments for public functions
- Keep functions focused and single-purpose

### Unity C#

- Follow Unity's coding conventions
- Use meaningful variable and method names
- Add XML documentation for public methods
- Handle exceptions appropriately

### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb in present tense (e.g., "Add", "Fix", "Update")
- Keep the first line under 50 characters
- Add detailed description if needed

Example:
```
Add GameObject search by component type

- Implement find_by_component tool
- Add support for exact type matching
- Include inactive object filtering
```

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Test both Node.js and Unity components
- Include integration tests when appropriate

## Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Update README.md if you've added new tools
4. Submit PR with clear description
5. Address review feedback promptly

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include Unity version and OS information
- Provide steps to reproduce for bugs
- Include relevant error messages and logs

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Collaborate openly and transparently

## Questions?

Feel free to open an issue for any questions about contributing!
