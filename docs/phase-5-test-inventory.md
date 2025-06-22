# Phase 5: Test File Inventory

## Current Test Files Location

### In `/src/` directory (8 files)
1. `src/config.test.js` - Config module tests
2. `src/e2e.test.js` - End-to-end tests
3. `src/integration-enhanced.test.js` - Enhanced integration tests
4. `src/integration.test.js` - Integration tests (DUPLICATE with tests/)
5. `src/unityConnection.test.js` - Unity connection tests
6. `src/unityConnection.parsing.test.js` - Unity connection parsing tests
7. `src/unityConnection.retry.test.js` - Unity connection retry tests
8. `src/unityConnection.test.js` - Unity connection tests

### In `/src/handlers/` directory (4 files)
1. `src/handlers/CreateSceneToolHandler.test.js`
2. `src/handlers/GetGameObjectDetailsToolHandler.test.js`
3. `src/handlers/LoadSceneToolHandler.test.js`
4. `src/handlers/SaveSceneToolHandler.test.js`

### In `/src/tools/` directory (11 files)
1. `src/tools/ping.test.js`
2. `src/tools/analysis/analyzeSceneContents.test.js`
3. `src/tools/analysis/findByComponent.test.js`
4. `src/tools/analysis/getComponentValues.test.js`
5. `src/tools/analysis/getGameObjectDetails.test.js`
6. `src/tools/analysis/getObjectReferences.test.js`
7. `src/tools/scene/createScene.test.js`
8. `src/tools/scene/getSceneInfo.test.js`
9. `src/tools/scene/listScenes.test.js`
10. `src/tools/scene/loadScene.test.js`
11. `src/tools/scene/saveScene.test.js`

### In `/tests/` directory (4 files)
1. `tests/handler-execution.test.js`
2. `tests/integration.test.js` - DUPLICATE with src/
3. `tests/mcp-protocol.test.js`
4. `tests/unity-connection.test.js` - Similar to src/unityConnection.test.js

## Identified Issues

### Duplicates
1. **integration.test.js** exists in both `/src/` and `/tests/`
2. **Unity connection tests** are split across multiple files with inconsistent naming:
   - `src/unityConnection.test.js` (camelCase)
   - `tests/unity-connection.test.js` (kebab-case)

### Inconsistent Organization
- Some tests co-located with source (handlers, tools)
- Some tests in dedicated tests directory
- Some tests in src root directory

## Proposed New Structure

```
/mcp-server/tests/
├── unit/
│   ├── core/
│   │   ├── config.test.js
│   │   ├── unityConnection.test.js
│   │   ├── unityConnection.parsing.test.js
│   │   └── unityConnection.retry.test.js
│   ├── handlers/
│   │   ├── CreateSceneToolHandler.test.js
│   │   ├── GetGameObjectDetailsToolHandler.test.js
│   │   ├── LoadSceneToolHandler.test.js
│   │   └── SaveSceneToolHandler.test.js
│   └── tools/
│       ├── ping.test.js
│       ├── analysis/
│       │   ├── analyzeSceneContents.test.js
│       │   ├── findByComponent.test.js
│       │   ├── getComponentValues.test.js
│       │   ├── getGameObjectDetails.test.js
│       │   └── getObjectReferences.test.js
│       └── scene/
│           ├── createScene.test.js
│           ├── getSceneInfo.test.js
│           ├── listScenes.test.js
│           ├── loadScene.test.js
│           └── saveScene.test.js
├── integration/
│   ├── handler-execution.test.js
│   ├── mcp-protocol.test.js
│   └── integration.test.js (merged from duplicates)
└── e2e/
    ├── e2e.test.js
    └── integration-enhanced.test.js
```

## Migration Plan

1. Create new directory structure
2. Run current tests to establish baseline
3. Move tests one by one, verifying each still passes
4. Merge duplicate tests
5. Update package.json test script
6. Remove old test files
7. Verify full test suite passes