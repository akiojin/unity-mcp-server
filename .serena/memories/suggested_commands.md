# Suggested Commands

## Testing
```bash
# Run all tests
npm run test --workspace=mcp-server

# Run CI tests
npm run test:ci --workspace=mcp-server

# Run with coverage
npm run test:coverage --workspace=mcp-server
```

## Linting & Formatting
```bash
# ESLint
npx eslint mcp-server/src/

# Prettier
npx prettier --write mcp-server/src/

# Markdownlint
npx markdownlint docs/
```

## Development
```bash
# Start server
npm run start --workspace=mcp-server

# Dev mode with watch
npm run dev --workspace=mcp-server
```

## Git
```bash
# Commit (Conventional Commits required)
git commit -m "feat: add feature"
git commit -m "fix: fix bug"

# Push
git push origin <branch>
```
