/**
 * Central export for all tool handlers
 */
export { BaseToolHandler } from './BaseToolHandler.js';
export { PingToolHandler } from './PingToolHandler.js';

import { PingToolHandler } from './PingToolHandler.js';

/**
 * Creates and returns all tool handlers
 * @param {UnityConnection} unityConnection - Connection to Unity
 * @returns {Map<string, BaseToolHandler>} Map of tool name to handler
 */
export function createHandlers(unityConnection) {
  const handlers = new Map();
  
  // Register all handlers
  const pingHandler = new PingToolHandler(unityConnection);
  handlers.set(pingHandler.name, pingHandler);
  
  // Future handlers will be added here:
  // handlers.set('create_gameobject', new CreateGameObjectHandler(unityConnection));
  // handlers.set('manage_scene', new ManageSceneHandler(unityConnection));
  // etc.
  
  return handlers;
}