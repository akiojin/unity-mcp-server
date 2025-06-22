/**
 * Central export and registration for all tool handlers
 */

// Export all handlers
export { BaseToolHandler } from './BaseToolHandler.js';
export { PingToolHandler } from './PingToolHandler.js';
export { ReadLogsToolHandler } from './ReadLogsToolHandler.js';
export { RefreshAssetsToolHandler } from './RefreshAssetsToolHandler.js';
export { CreateGameObjectToolHandler } from './CreateGameObjectToolHandler.js';
export { FindGameObjectToolHandler } from './FindGameObjectToolHandler.js';
export { ModifyGameObjectToolHandler } from './ModifyGameObjectToolHandler.js';
export { DeleteGameObjectToolHandler } from './DeleteGameObjectToolHandler.js';
export { GetHierarchyToolHandler } from './GetHierarchyToolHandler.js';
export { CreateSceneToolHandler } from './CreateSceneToolHandler.js';
export { LoadSceneToolHandler } from './LoadSceneToolHandler.js';
export { SaveSceneToolHandler } from './SaveSceneToolHandler.js';
export { ListScenesToolHandler } from './ListScenesToolHandler.js';
export { GetSceneInfoToolHandler } from './GetSceneInfoToolHandler.js';
export { GetGameObjectDetailsToolHandler } from './GetGameObjectDetailsToolHandler.js';
export { AnalyzeSceneContentsToolHandler } from './AnalyzeSceneContentsToolHandler.js';
export { GetComponentValuesToolHandler } from './GetComponentValuesToolHandler.js';
export { FindByComponentToolHandler } from './FindByComponentToolHandler.js';
export { GetObjectReferencesToolHandler } from './GetObjectReferencesToolHandler.js';
export { PlayToolHandler } from './PlayToolHandler.js';
export { PauseToolHandler } from './PauseToolHandler.js';
export { StopToolHandler } from './StopToolHandler.js';
export { GetEditorStateToolHandler } from './GetEditorStateToolHandler.js';

// Import all handler classes at once
import { PingToolHandler } from './PingToolHandler.js';
import { ReadLogsToolHandler } from './ReadLogsToolHandler.js';
import { RefreshAssetsToolHandler } from './RefreshAssetsToolHandler.js';
import { CreateGameObjectToolHandler } from './CreateGameObjectToolHandler.js';
import { FindGameObjectToolHandler } from './FindGameObjectToolHandler.js';
import { ModifyGameObjectToolHandler } from './ModifyGameObjectToolHandler.js';
import { DeleteGameObjectToolHandler } from './DeleteGameObjectToolHandler.js';
import { GetHierarchyToolHandler } from './GetHierarchyToolHandler.js';
import { CreateSceneToolHandler } from './CreateSceneToolHandler.js';
import { LoadSceneToolHandler } from './LoadSceneToolHandler.js';
import { SaveSceneToolHandler } from './SaveSceneToolHandler.js';
import { ListScenesToolHandler } from './ListScenesToolHandler.js';
import { GetSceneInfoToolHandler } from './GetSceneInfoToolHandler.js';
import { GetGameObjectDetailsToolHandler } from './GetGameObjectDetailsToolHandler.js';
import { AnalyzeSceneContentsToolHandler } from './AnalyzeSceneContentsToolHandler.js';
import { GetComponentValuesToolHandler } from './GetComponentValuesToolHandler.js';
import { FindByComponentToolHandler } from './FindByComponentToolHandler.js';
import { GetObjectReferencesToolHandler } from './GetObjectReferencesToolHandler.js';
import { PlayToolHandler } from './PlayToolHandler.js';
import { PauseToolHandler } from './PauseToolHandler.js';
import { StopToolHandler } from './StopToolHandler.js';
import { GetEditorStateToolHandler } from './GetEditorStateToolHandler.js';

// Handler registry - single source of truth
const HANDLER_CLASSES = [
  // Core handlers
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
  
  // Scene Analysis handlers
  GetGameObjectDetailsToolHandler,
  AnalyzeSceneContentsToolHandler,
  GetComponentValuesToolHandler,
  FindByComponentToolHandler,
  GetObjectReferencesToolHandler,
  
  // Play Mode Control handlers
  PlayToolHandler,
  PauseToolHandler,
  StopToolHandler,
  GetEditorStateToolHandler
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