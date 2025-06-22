/**
 * Central export for all tool handlers
 */
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

/**
 * Creates and returns all tool handlers
 * @param {UnityConnection} unityConnection - Connection to Unity
 * @returns {Map<string, BaseToolHandler>} Map of tool name to handler
 */
export function createHandlers(unityConnection) {
  const handlers = new Map();
  
  // Core handlers
  const pingHandler = new PingToolHandler(unityConnection);
  handlers.set(pingHandler.name, pingHandler);
  
  const readLogsHandler = new ReadLogsToolHandler(unityConnection);
  handlers.set(readLogsHandler.name, readLogsHandler);
  
  const refreshAssetsHandler = new RefreshAssetsToolHandler(unityConnection);
  handlers.set(refreshAssetsHandler.name, refreshAssetsHandler);
  
  // GameObject handlers
  const createGameObjectHandler = new CreateGameObjectToolHandler(unityConnection);
  handlers.set(createGameObjectHandler.name, createGameObjectHandler);
  
  const findGameObjectHandler = new FindGameObjectToolHandler(unityConnection);
  handlers.set(findGameObjectHandler.name, findGameObjectHandler);
  
  const modifyGameObjectHandler = new ModifyGameObjectToolHandler(unityConnection);
  handlers.set(modifyGameObjectHandler.name, modifyGameObjectHandler);
  
  const deleteGameObjectHandler = new DeleteGameObjectToolHandler(unityConnection);
  handlers.set(deleteGameObjectHandler.name, deleteGameObjectHandler);
  
  const getHierarchyHandler = new GetHierarchyToolHandler(unityConnection);
  handlers.set(getHierarchyHandler.name, getHierarchyHandler);
  
  // Scene handlers
  const createSceneHandler = new CreateSceneToolHandler(unityConnection);
  handlers.set(createSceneHandler.name, createSceneHandler);
  
  const loadSceneHandler = new LoadSceneToolHandler(unityConnection);
  handlers.set(loadSceneHandler.name, loadSceneHandler);
  
  const saveSceneHandler = new SaveSceneToolHandler(unityConnection);
  handlers.set(saveSceneHandler.name, saveSceneHandler);
  
  const listScenesHandler = new ListScenesToolHandler(unityConnection);
  handlers.set(listScenesHandler.name, listScenesHandler);
  
  const getSceneInfoHandler = new GetSceneInfoToolHandler(unityConnection);
  handlers.set(getSceneInfoHandler.name, getSceneInfoHandler);
  
  return handlers;
}