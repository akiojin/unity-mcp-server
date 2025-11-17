/**
 * Tool metadata categories and constants for search_tools optimization
 */

/**
 * Tool categories for grouping related functionality
 */
export const CATEGORIES = {
  SYSTEM: 'system',
  GAMEOBJECT: 'gameobject',
  SCENE: 'scene',
  ANALYSIS: 'analysis',
  PLAYMODE: 'playmode',
  UI: 'ui',
  INPUT: 'input',
  ASSET: 'asset',
  PREFAB: 'prefab',
  MATERIAL: 'material',
  ADDRESSABLES: 'addressables',
  MENU: 'menu',
  CONSOLE: 'console',
  SCREENSHOT: 'screenshot',
  VIDEO: 'video',
  COMPONENT: 'component',
  COMPILATION: 'compilation',
  TEST: 'test',
  EDITOR: 'editor',
  SETTINGS: 'settings',
  PACKAGE: 'package',
  SCRIPT: 'script'
};

/**
 * Tool scopes indicating read/write/execute permissions
 */
export const SCOPES = {
  READ: 'read',
  WRITE: 'write',
  EXECUTE: 'execute'
};

/**
 * Common tags for cross-cutting concerns
 */
export const TAGS = {
  // Operation types
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  QUERY: 'query',
  ANALYZE: 'analyze',

  // Scope tags
  HIERARCHY: 'hierarchy',
  PREFAB_MODE: 'prefab_mode',
  PLAYMODE: 'playmode',
  EDITOR_ONLY: 'editor_only',

  // Resource types
  ASSET: 'asset',
  SCENE: 'scene',
  RUNTIME: 'runtime',

  // Input/Output
  INPUT: 'input',
  OUTPUT: 'output',
  VISUAL: 'visual'
};
