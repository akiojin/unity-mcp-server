# Contributing to Unity Editor MCP

Thank you for your interest in contributing to Unity Editor MCP! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/unity-mcp-server.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Unity 2020.3 LTS or newer
- Node.js 18.0.0 or newer
- Git

### Developer Setup (C# LSP)

End users do not need .NET. The MCP server auto-provisions a self-contained C# LSP by tag. As a contributor, you can build it locally if needed:

- Build from source (requires .NET 9 SDK):
  - `dotnet publish csharp-lsp/Server.csproj -c Release -r <rid> --self-contained true -p:PublishSingleFile=true -o out/<rid>`
- Copy `out/<rid>/server(.exe)` to `~/.unity/tools/csharp-lsp/<rid>/server(.exe)`

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
