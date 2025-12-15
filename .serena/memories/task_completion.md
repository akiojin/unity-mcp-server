# Task Completion Checklist

## Before Committing
1. Run tests: `npm run test:ci --workspace=mcp-server`
2. Run ESLint: `npx eslint mcp-server/src/`
3. Run Prettier: `npx prettier --check mcp-server/src/`

## Commit & Push
1. Use Conventional Commits format
2. `git add .`
3. `git commit -m "type(scope): message"`
4. `git push`

## For C# Changes
- Use unity-mcp-server tools, not Serena
- Check Unity compilation after changes
