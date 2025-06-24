/**
 * Central export and registration for all tool handlers
 */

// Export all handlers
export { BaseToolHandler } from './base/BaseToolHandler.js';

// System handlers
export { PingToolHandler } from './system/PingToolHandler.js';
export { ReadLogsToolHandler } from './system/ReadLogsToolHandler.js';
export { RefreshAssetsToolHandler } from './system/RefreshAssetsToolHandler.js';

// GameObject handlers
export { CreateGameObjectToolHandler } from './gameobject/CreateGameObjectToolHandler.js';
export { FindGameObjectToolHandler } from './gameobject/FindGameObjectToolHandler.js';
export { ModifyGameObjectToolHandler } from './gameobject/ModifyGameObjectToolHandler.js';
export { DeleteGameObjectToolHandler } from './gameobject/DeleteGameObjectToolHandler.js';
export { GetHierarchyToolHandler } from './gameobject/GetHierarchyToolHandler.js';

// Scene handlers
export { CreateSceneToolHandler } from './scene/CreateSceneToolHandler.js';
export { LoadSceneToolHandler } from './scene/LoadSceneToolHandler.js';
export { SaveSceneToolHandler } from './scene/SaveSceneToolHandler.js';
export { ListScenesToolHandler } from './scene/ListScenesToolHandler.js';
export { GetSceneInfoToolHandler } from './scene/GetSceneInfoToolHandler.js';

// Analysis handlers
export { GetGameObjectDetailsToolHandler } from './analysis/GetGameObjectDetailsToolHandler.js';
export { AnalyzeSceneContentsToolHandler } from './analysis/AnalyzeSceneContentsToolHandler.js';
export { GetComponentValuesToolHandler } from './analysis/GetComponentValuesToolHandler.js';
export { FindByComponentToolHandler } from './analysis/FindByComponentToolHandler.js';
export { GetObjectReferencesToolHandler } from './analysis/GetObjectReferencesToolHandler.js';

// PlayMode handlers
export { PlayToolHandler } from './playmode/PlayToolHandler.js';
export { PauseToolHandler } from './playmode/PauseToolHandler.js';
export { StopToolHandler } from './playmode/StopToolHandler.js';
export { GetEditorStateToolHandler } from './playmode/GetEditorStateToolHandler.js';

// UI handlers
export { FindUIElementsToolHandler } from './ui/FindUIElementsToolHandler.js';
export { ClickUIElementToolHandler } from './ui/ClickUIElementToolHandler.js';
export { GetUIElementStateToolHandler } from './ui/GetUIElementStateToolHandler.js';
export { SetUIElementValueToolHandler } from './ui/SetUIElementValueToolHandler.js';
export { SimulateUIInputToolHandler } from './ui/SimulateUIInputToolHandler.js';

// Asset handlers
export { CreatePrefabToolHandler } from './asset/CreatePrefabToolHandler.js';
export { ModifyPrefabToolHandler } from './asset/ModifyPrefabToolHandler.js';
export { InstantiatePrefabToolHandler } from './asset/InstantiatePrefabToolHandler.js';
export { CreateMaterialToolHandler } from './asset/CreateMaterialToolHandler.js';
export { ModifyMaterialToolHandler } from './asset/ModifyMaterialToolHandler.js';

// Import all handler classes at once
import { PingToolHandler } from './system/PingToolHandler.js';
import { ReadLogsToolHandler } from './system/ReadLogsToolHandler.js';
import { RefreshAssetsToolHandler } from './system/RefreshAssetsToolHandler.js';
import { CreateGameObjectToolHandler } from './gameobject/CreateGameObjectToolHandler.js';
import { FindGameObjectToolHandler } from './gameobject/FindGameObjectToolHandler.js';
import { ModifyGameObjectToolHandler } from './gameobject/ModifyGameObjectToolHandler.js';
import { DeleteGameObjectToolHandler } from './gameobject/DeleteGameObjectToolHandler.js';
import { GetHierarchyToolHandler } from './gameobject/GetHierarchyToolHandler.js';
import { CreateSceneToolHandler } from './scene/CreateSceneToolHandler.js';
import { LoadSceneToolHandler } from './scene/LoadSceneToolHandler.js';
import { SaveSceneToolHandler } from './scene/SaveSceneToolHandler.js';
import { ListScenesToolHandler } from './scene/ListScenesToolHandler.js';
import { GetSceneInfoToolHandler } from './scene/GetSceneInfoToolHandler.js';
import { GetGameObjectDetailsToolHandler } from './analysis/GetGameObjectDetailsToolHandler.js';
import { AnalyzeSceneContentsToolHandler } from './analysis/AnalyzeSceneContentsToolHandler.js';
import { GetComponentValuesToolHandler } from './analysis/GetComponentValuesToolHandler.js';
import { FindByComponentToolHandler } from './analysis/FindByComponentToolHandler.js';
import { GetObjectReferencesToolHandler } from './analysis/GetObjectReferencesToolHandler.js';
import { PlayToolHandler } from './playmode/PlayToolHandler.js';
import { PauseToolHandler } from './playmode/PauseToolHandler.js';
import { StopToolHandler } from './playmode/StopToolHandler.js';
import { GetEditorStateToolHandler } from './playmode/GetEditorStateToolHandler.js';
import { FindUIElementsToolHandler } from './ui/FindUIElementsToolHandler.js';
import { ClickUIElementToolHandler } from './ui/ClickUIElementToolHandler.js';
import { GetUIElementStateToolHandler } from './ui/GetUIElementStateToolHandler.js';
import { SetUIElementValueToolHandler } from './ui/SetUIElementValueToolHandler.js';
import { SimulateUIInputToolHandler } from './ui/SimulateUIInputToolHandler.js';
import { CreatePrefabToolHandler } from './asset/CreatePrefabToolHandler.js';
import { ModifyPrefabToolHandler } from './asset/ModifyPrefabToolHandler.js';
import { InstantiatePrefabToolHandler } from './asset/InstantiatePrefabToolHandler.js';
import { CreateMaterialToolHandler } from './asset/CreateMaterialToolHandler.js';
import { ModifyMaterialToolHandler } from './asset/ModifyMaterialToolHandler.js';

// Handler registry - single source of truth
const HANDLER_CLASSES = [
  // System handlers
  PingToolHandler,
  ReadLogsToolHandler,
  RefreshAssetsToolHandler,
  
  // GameObject handlers
  CreateGameObjectToolHandler,
  FindGameObjectToolHandler,
  ModifyGameObjectToolHandler,
  DeleteGameObjectToolHandler,
  GetHierarchyToolHandler,
  
  // Scene handlers
  CreateSceneToolHandler,
  LoadSceneToolHandler,
  SaveSceneToolHandler,
  ListScenesToolHandler,
  GetSceneInfoToolHandler,
  
  // Analysis handlers
  GetGameObjectDetailsToolHandler,
  AnalyzeSceneContentsToolHandler,
  GetComponentValuesToolHandler,
  FindByComponentToolHandler,
  GetObjectReferencesToolHandler,
  
  // PlayMode handlers
  PlayToolHandler,
  PauseToolHandler,
  StopToolHandler,
  GetEditorStateToolHandler,
  
  // UI handlers
  FindUIElementsToolHandler,
  ClickUIElementToolHandler,
  GetUIElementStateToolHandler,
  SetUIElementValueToolHandler,
  SimulateUIInputToolHandler,
  
  // Asset handlers
  CreatePrefabToolHandler,
  ModifyPrefabToolHandler,
  InstantiatePrefabToolHandler,
  CreateMaterialToolHandler,
  ModifyMaterialToolHandler
];

/**
 * Creates and returns all tool handlers
 * @param {UnityConnection} unityConnection - Connection to Unity
 * @returns {Map<string, BaseToolHandler>} Map of tool name to handler
 */
export function createHandlers(unityConnection) {
  const handlers = new Map();
  
  // Instantiate all handlers from the registry
  for (const HandlerClass of HANDLER_CLASSES) {
    const handler = new HandlerClass(unityConnection);
    handlers.set(handler.name, handler);
  }
  
  return handlers;
}