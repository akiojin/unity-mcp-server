# GitHub Actions Setup for Test Coverage

## How it works

The test coverage workflow automatically:
1. Runs tests with coverage on every push to main and on PRs
2. Uploads coverage reports to Codecov
3. Updates the coverage badge in README.md

## Setup Instructions

1. **Enable Codecov:**
   - Go to https://codecov.io
   - Sign in with GitHub
   - Add your repository
   - Codecov will automatically detect coverage reports from GitHub Actions

2. **The badge will automatically show coverage** once the first workflow run completes

That's it! No secrets or additional configuration needed. Codecov works automatically with public repositories.