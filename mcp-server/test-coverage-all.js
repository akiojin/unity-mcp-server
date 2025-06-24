#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// List of test files to run
const testFiles = [
  'tests/unit/core/unityConnection.test.js',
  'tests/unit/core/config.test.js', 
  'tests/unit/handlers/BaseToolHandler.test.js',
  'tests/unit/handlers/PingToolHandler.test.js',
  'tests/unit/handlers/CreateGameObjectToolHandler.test.js',
  'tests/unit/handlers/GetHierarchyToolHandler.test.js',
  'tests/unit/handlers/FindGameObjectToolHandler.test.js',
  'tests/unit/handlers/DeleteGameObjectToolHandler.test.js',
  'tests/unit/handlers/ModifyGameObjectToolHandler.test.js',
  'tests/unit/handlers/CreateSceneToolHandler.test.js',
  'tests/unit/handlers/LoadSceneToolHandler.test.js',
  'tests/unit/handlers/SaveSceneToolHandler.test.js',
  'tests/unit/handlers/GetSceneInfoToolHandler.test.js',
  'tests/unit/handlers/ListScenesToolHandler.test.js',
  'tests/unit/handlers/ReadLogsToolHandler.test.js',
  'tests/unit/handlers/RefreshAssetsToolHandler.test.js',
  'tests/unit/handlers/PlayToolHandler.test.js',
  'tests/unit/handlers/PauseToolHandler.test.js',
  'tests/unit/handlers/StopToolHandler.test.js',
  'tests/unit/handlers/GetEditorStateToolHandler.test.js',
  'tests/unit/tools/system/ping.test.js',
  'tests/unit/tools/scene/createScene.test.js',
  'tests/unit/tools/scene/getSceneInfo.test.js',
  'tests/unit/tools/scene/listScenes.test.js',
  'tests/unit/tools/scene/loadScene.test.js',
  'tests/unit/tools/scene/saveScene.test.js',
  'tests/unit/tools/analysis/analyzeSceneContents.test.js',
  'tests/unit/tools/analysis/findByComponent.test.js',
  'tests/unit/tools/analysis/getComponentValues.test.js',
  'tests/unit/tools/analysis/getGameObjectDetails.test.js',
  'tests/unit/tools/analysis/getObjectReferences.test.js',
  'tests/unit/handlers/ui/FindUIElementsToolHandler.test.js',
  'tests/unit/handlers/ui/ClickUIElementToolHandler.test.js',
  'tests/unit/handlers/ui/GetUIElementStateToolHandler.test.js',
  'tests/unit/handlers/ui/SetUIElementValueToolHandler.test.js',
  'tests/unit/handlers/ui/SimulateUIInputToolHandler.test.js',
  'tests/unit/handlers/asset/CreateMaterialToolHandler.test.js',
  'tests/unit/handlers/asset/CreatePrefabToolHandler.test.js',
  'tests/unit/handlers/asset/ModifyMaterialToolHandler.test.js',
  'tests/unit/handlers/asset/ModifyPrefabToolHandler.test.js',
  'tests/unit/handlers/asset/InstantiatePrefabToolHandler.test.js',
  'tests/unit/utils/validators.test.js'
];

// Run c8 with all test files
const args = [
  'c8',
  '--reporter=text',
  '--all',
  '--src=src',
  '--check-coverage=false',
  '--exclude=src/core/server.js',
  'node',
  '--test',
  ...testFiles
];

console.log('Running comprehensive coverage test...');
const child = spawn('npx', args, {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('close', (code) => {
  process.exit(code);
});