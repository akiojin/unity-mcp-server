/**
 * Central export and registration for all tool handlers
 */

// Export all handlers
export { BaseToolHandler } from './base/BaseToolHandler.js';

// System handlers
export { SystemPingToolHandler } from './system/SystemPingToolHandler.js';
export { SystemRefreshAssetsToolHandler } from './system/SystemRefreshAssetsToolHandler.js';
export { SystemGetCommandStatsToolHandler } from './system/SystemGetCommandStatsToolHandler.js';

// GameObject handlers
export { GameObjectCreateToolHandler } from './gameobject/GameObjectCreateToolHandler.js';
export { GameObjectFindToolHandler } from './gameobject/GameObjectFindToolHandler.js';
export { GameObjectModifyToolHandler } from './gameobject/GameObjectModifyToolHandler.js';
export { GameObjectDeleteToolHandler } from './gameobject/GameObjectDeleteToolHandler.js';
export { GameObjectGetHierarchyToolHandler } from './gameobject/GameObjectGetHierarchyToolHandler.js';

// Scene handlers
export { SceneCreateToolHandler } from './scene/SceneCreateToolHandler.js';
export { SceneLoadToolHandler } from './scene/SceneLoadToolHandler.js';
export { SceneSaveToolHandler } from './scene/SceneSaveToolHandler.js';
export { SceneListToolHandler } from './scene/SceneListToolHandler.js';
export { GetSceneInfoToolHandler } from './scene/GetSceneInfoToolHandler.js';

// Analysis handlers
export { GetGameObjectDetailsToolHandler } from './analysis/GetGameObjectDetailsToolHandler.js';
export { AnalyzeSceneContentsToolHandler } from './analysis/AnalyzeSceneContentsToolHandler.js';
export { GetComponentValuesToolHandler } from './analysis/GetComponentValuesToolHandler.js';
export { FindByComponentToolHandler } from './analysis/FindByComponentToolHandler.js';
export { GetObjectReferencesToolHandler } from './analysis/GetObjectReferencesToolHandler.js';
export { GetAnimatorStateToolHandler, GetAnimatorRuntimeInfoToolHandler } from './analysis/GetAnimatorStateToolHandler.js';
export { GetInputActionsStateToolHandler, AnalyzeInputActionsAssetToolHandler } from './analysis/GetInputActionsStateToolHandler.js';

// PlayMode handlers
export { PlaymodePlayToolHandler } from './playmode/PlaymodePlayToolHandler.js';
export { PlaymodePauseToolHandler } from './playmode/PlaymodePauseToolHandler.js';
export { PlaymodeStopToolHandler } from './playmode/PlaymodeStopToolHandler.js';
export { PlaymodeGetStateToolHandler } from './playmode/PlaymodeGetStateToolHandler.js';
export { PlaymodeWaitForStateToolHandler } from './playmode/PlaymodeWaitForStateToolHandler.js';

// UI handlers
export { UIFindElementsToolHandler } from './ui/UIFindElementsToolHandler.js';
export { UIClickElementToolHandler } from './ui/UIClickElementToolHandler.js';
export { UIGetElementStateToolHandler } from './ui/UIGetElementStateToolHandler.js';
export { UISetElementValueToolHandler } from './ui/UISetElementValueToolHandler.js';
export { UISimulateInputToolHandler } from './ui/UISimulateInputToolHandler.js';

// Input System handlers
export { InputSystemControlToolHandler } from './input/InputSystemControlToolHandler.js';
export { InputKeyboardSimulateToolHandler } from './input/InputKeyboardSimulateToolHandler.js';
export { InputMouseSimulateToolHandler } from './input/InputMouseSimulateToolHandler.js';
export { InputGamepadSimulateToolHandler } from './input/InputGamepadSimulateToolHandler.js';
export { InputTouchSimulateToolHandler } from './input/InputTouchSimulateToolHandler.js';
export { InputActionMapCreateToolHandler } from './input/InputActionMapCreateToolHandler.js';
export { InputActionMapRemoveToolHandler } from './input/InputActionMapRemoveToolHandler.js';
export { InputActionAddToolHandler } from './input/InputActionAddToolHandler.js';
export { InputActionRemoveToolHandler } from './input/InputActionRemoveToolHandler.js';
export { InputBindingAddToolHandler } from './input/InputBindingAddToolHandler.js';
export { InputBindingRemoveToolHandler } from './input/InputBindingRemoveToolHandler.js';
export { InputBindingRemoveAllToolHandler } from './input/InputBindingRemoveAllToolHandler.js';
export { InputBindingCompositeCreateToolHandler } from './input/InputBindingCompositeCreateToolHandler.js';
export { InputControlSchemesManageToolHandler } from './input/InputControlSchemesManageToolHandler.js';

// Asset handlers
export { AssetPrefabCreateToolHandler } from './asset/AssetPrefabCreateToolHandler.js';
export { AssetPrefabModifyToolHandler } from './asset/AssetPrefabModifyToolHandler.js';
export { AssetPrefabInstantiateToolHandler } from './asset/AssetPrefabInstantiateToolHandler.js';
export { AssetMaterialCreateToolHandler } from './asset/AssetMaterialCreateToolHandler.js';
export { AssetMaterialModifyToolHandler } from './asset/AssetMaterialModifyToolHandler.js';
export { AssetPrefabOpenToolHandler } from './asset/AssetPrefabOpenToolHandler.js';
export { AssetPrefabExitModeToolHandler } from './asset/AssetPrefabExitModeToolHandler.js';
export { AssetPrefabSaveToolHandler } from './asset/AssetPrefabSaveToolHandler.js';
export { AssetImportSettingsManageToolHandler } from './asset/AssetImportSettingsManageToolHandler.js';
export { AssetDatabaseManageToolHandler } from './asset/AssetDatabaseManageToolHandler.js';
export { AssetDependencyAnalyzeToolHandler } from './asset/AssetDependencyAnalyzeToolHandler.js';

// Menu handlers
export { MenuItemExecuteToolHandler } from './menu/MenuItemExecuteToolHandler.js';

// Console handlers
export { ConsoleClearToolHandler } from './console/ConsoleClearToolHandler.js';
export { ConsoleReadToolHandler } from './console/ConsoleReadToolHandler.js';

// Screenshot handlers
export { ScreenshotCaptureToolHandler } from './screenshot/ScreenshotCaptureToolHandler.js';
export { ScreenshotAnalyzeToolHandler } from './screenshot/ScreenshotAnalyzeToolHandler.js';

// Video handlers
export { VideoCaptureStartToolHandler } from './video/VideoCaptureStartToolHandler.js';
export { VideoCaptureStopToolHandler } from './video/VideoCaptureStopToolHandler.js';
export { VideoCaptureStatusToolHandler } from './video/VideoCaptureStatusToolHandler.js';
export { VideoCaptureForToolHandler } from './video/VideoCaptureForToolHandler.js';

// Component handlers
export { ComponentAddToolHandler } from './component/ComponentAddToolHandler.js';
export { ComponentRemoveToolHandler } from './component/ComponentRemoveToolHandler.js';
export { ComponentModifyToolHandler } from './component/ComponentModifyToolHandler.js';
export { ComponentListToolHandler } from './component/ComponentListToolHandler.js';
export { ComponentGetTypesToolHandler } from './component/ComponentGetTypesToolHandler.js';

// Compilation handlers
export { CompilationGetStateToolHandler } from './compilation/CompilationGetStateToolHandler.js';

// Test handlers
export { TestRunToolHandler } from './test/TestRunToolHandler.js';
export { TestGetStatusToolHandler } from './test/TestGetStatusToolHandler.js';

// Terminal handlers
export { TerminalOpenToolHandler } from './terminal/TerminalOpenToolHandler.js';
export { TerminalExecuteToolHandler } from './terminal/TerminalExecuteToolHandler.js';
export { TerminalReadToolHandler } from './terminal/TerminalReadToolHandler.js';
export { TerminalCloseToolHandler } from './terminal/TerminalCloseToolHandler.js';

// AI session handlers
export { AiSessionOpenHandler } from './ai/AiSessionOpenHandler.js';
export { AiSessionMessageHandler } from './ai/AiSessionMessageHandler.js';
export { AiSessionExecuteHandler } from './ai/AiSessionExecuteHandler.js';
export { AiSessionCloseHandler } from './ai/AiSessionCloseHandler.js';
export { AiStreamDispatcher } from './ai/AiStreamDispatcher.js';

// Editor control handlers
export { EditorTagsManageToolHandler } from './editor/EditorTagsManageToolHandler.js';
export { EditorLayersManageToolHandler } from './editor/EditorLayersManageToolHandler.js';
export { EditorSelectionManageToolHandler } from './editor/EditorSelectionManageToolHandler.js';
export { EditorWindowsManageToolHandler } from './editor/EditorWindowsManageToolHandler.js';
export { EditorToolsManageToolHandler } from './editor/EditorToolsManageToolHandler.js';

// Settings handlers
export { SettingsGetToolHandler } from './settings/SettingsGetToolHandler.js';
export { SettingsUpdateToolHandler } from './settings/SettingsUpdateToolHandler.js';

// Package management handlers
export { default as PackageManagerToolHandler } from './package/PackageManagerToolHandler.js';
export { default as RegistryConfigToolHandler } from './package/RegistryConfigToolHandler.js';

// Script handlers
export { ScriptPackagesListToolHandler } from './script/ScriptPackagesListToolHandler.js';
export { ScriptReadToolHandler } from './script/ScriptReadToolHandler.js';
export { ScriptSearchToolHandler } from './script/ScriptSearchToolHandler.js';
export { ScriptEditStructuredToolHandler } from './script/ScriptEditStructuredToolHandler.js';
export { ScriptEditSnippetToolHandler } from './script/ScriptEditSnippetToolHandler.js';
export { ScriptRefsFindToolHandler } from './script/ScriptRefsFindToolHandler.js';
export { ScriptSymbolFindToolHandler } from './script/ScriptSymbolFindToolHandler.js';
export { ScriptSymbolsGetToolHandler } from './script/ScriptSymbolsGetToolHandler.js';
export { CodeIndexStatusToolHandler } from './script/CodeIndexStatusToolHandler.js';
export { ScriptRefactorRenameToolHandler } from './script/ScriptRefactorRenameToolHandler.js';
export { ScriptCreateClassToolHandler } from './script/ScriptCreateClassToolHandler.js';
export { ScriptRemoveSymbolToolHandler } from './script/ScriptRemoveSymbolToolHandler.js';
export { CodeIndexUpdateToolHandler } from './script/CodeIndexUpdateToolHandler.js';
export { CodeIndexBuildToolHandler } from './script/CodeIndexBuildToolHandler.js';
// Deprecated Unity-communication handlers removed: ScriptEditPatchToolHandler, ScriptReplacePatternToolHandler
// Script tool registry

// Import all handler classes at once
import { SystemPingToolHandler } from './system/SystemPingToolHandler.js';
import { SystemRefreshAssetsToolHandler } from './system/SystemRefreshAssetsToolHandler.js';
import { SystemGetCommandStatsToolHandler } from './system/SystemGetCommandStatsToolHandler.js';
import { GameObjectCreateToolHandler } from './gameobject/GameObjectCreateToolHandler.js';
import { GameObjectFindToolHandler } from './gameobject/GameObjectFindToolHandler.js';
import { GameObjectModifyToolHandler } from './gameobject/GameObjectModifyToolHandler.js';
import { GameObjectDeleteToolHandler } from './gameobject/GameObjectDeleteToolHandler.js';
import { GameObjectGetHierarchyToolHandler } from './gameobject/GameObjectGetHierarchyToolHandler.js';
import { SceneCreateToolHandler } from './scene/SceneCreateToolHandler.js';
import { SceneLoadToolHandler } from './scene/SceneLoadToolHandler.js';
import { SceneSaveToolHandler } from './scene/SceneSaveToolHandler.js';
import { SceneListToolHandler } from './scene/SceneListToolHandler.js';
import { GetSceneInfoToolHandler } from './scene/GetSceneInfoToolHandler.js';
import { GetGameObjectDetailsToolHandler } from './analysis/GetGameObjectDetailsToolHandler.js';
import { AnalyzeSceneContentsToolHandler } from './analysis/AnalyzeSceneContentsToolHandler.js';
import { GetComponentValuesToolHandler } from './analysis/GetComponentValuesToolHandler.js';
import { FindByComponentToolHandler } from './analysis/FindByComponentToolHandler.js';
import { GetObjectReferencesToolHandler } from './analysis/GetObjectReferencesToolHandler.js';
import { GetAnimatorStateToolHandler, GetAnimatorRuntimeInfoToolHandler } from './analysis/GetAnimatorStateToolHandler.js';
import { GetInputActionsStateToolHandler, AnalyzeInputActionsAssetToolHandler } from './analysis/GetInputActionsStateToolHandler.js';
import { PlaymodePlayToolHandler } from './playmode/PlaymodePlayToolHandler.js';
import { PlaymodePauseToolHandler } from './playmode/PlaymodePauseToolHandler.js';
import { PlaymodeStopToolHandler } from './playmode/PlaymodeStopToolHandler.js';
import { PlaymodeGetStateToolHandler } from './playmode/PlaymodeGetStateToolHandler.js';
import { PlaymodeWaitForStateToolHandler } from './playmode/PlaymodeWaitForStateToolHandler.js';
import { UIFindElementsToolHandler } from './ui/UIFindElementsToolHandler.js';
import { UIClickElementToolHandler } from './ui/UIClickElementToolHandler.js';
import { UIGetElementStateToolHandler } from './ui/UIGetElementStateToolHandler.js';
import { UISetElementValueToolHandler } from './ui/UISetElementValueToolHandler.js';
import { UISimulateInputToolHandler } from './ui/UISimulateInputToolHandler.js';
import { InputSystemControlToolHandler } from './input/InputSystemControlToolHandler.js';
import { InputKeyboardSimulateToolHandler } from './input/InputKeyboardSimulateToolHandler.js';
import { InputMouseSimulateToolHandler } from './input/InputMouseSimulateToolHandler.js';
import { InputGamepadSimulateToolHandler } from './input/InputGamepadSimulateToolHandler.js';
import { InputTouchSimulateToolHandler } from './input/InputTouchSimulateToolHandler.js';
import { InputActionMapCreateToolHandler } from './input/InputActionMapCreateToolHandler.js';
import { InputActionMapRemoveToolHandler } from './input/InputActionMapRemoveToolHandler.js';
import { InputActionAddToolHandler } from './input/InputActionAddToolHandler.js';
import { InputActionRemoveToolHandler } from './input/InputActionRemoveToolHandler.js';
import { InputBindingAddToolHandler } from './input/InputBindingAddToolHandler.js';
import { InputBindingRemoveToolHandler } from './input/InputBindingRemoveToolHandler.js';
import { InputBindingRemoveAllToolHandler } from './input/InputBindingRemoveAllToolHandler.js';
import { InputBindingCompositeCreateToolHandler } from './input/InputBindingCompositeCreateToolHandler.js';
import { InputControlSchemesManageToolHandler } from './input/InputControlSchemesManageToolHandler.js';
import { AssetPrefabCreateToolHandler } from './asset/AssetPrefabCreateToolHandler.js';
import { AssetPrefabModifyToolHandler } from './asset/AssetPrefabModifyToolHandler.js';
import { AssetPrefabInstantiateToolHandler } from './asset/AssetPrefabInstantiateToolHandler.js';
import { AssetMaterialCreateToolHandler } from './asset/AssetMaterialCreateToolHandler.js';
import { AssetMaterialModifyToolHandler } from './asset/AssetMaterialModifyToolHandler.js';
import { AssetPrefabOpenToolHandler } from './asset/AssetPrefabOpenToolHandler.js';
import { AssetPrefabExitModeToolHandler } from './asset/AssetPrefabExitModeToolHandler.js';
import { AssetPrefabSaveToolHandler } from './asset/AssetPrefabSaveToolHandler.js';
import { AssetImportSettingsManageToolHandler } from './asset/AssetImportSettingsManageToolHandler.js';
import { AssetDatabaseManageToolHandler } from './asset/AssetDatabaseManageToolHandler.js';
import { AssetDependencyAnalyzeToolHandler } from './asset/AssetDependencyAnalyzeToolHandler.js';
import { MenuItemExecuteToolHandler } from './menu/MenuItemExecuteToolHandler.js';
import { ConsoleClearToolHandler } from './console/ConsoleClearToolHandler.js';
import { ConsoleReadToolHandler } from './console/ConsoleReadToolHandler.js';
import { ScreenshotCaptureToolHandler } from './screenshot/ScreenshotCaptureToolHandler.js';
import { ScreenshotAnalyzeToolHandler } from './screenshot/ScreenshotAnalyzeToolHandler.js';
import { VideoCaptureStartToolHandler } from './video/VideoCaptureStartToolHandler.js';
import { VideoCaptureStopToolHandler } from './video/VideoCaptureStopToolHandler.js';
import { VideoCaptureStatusToolHandler } from './video/VideoCaptureStatusToolHandler.js';
import { VideoCaptureForToolHandler } from './video/VideoCaptureForToolHandler.js';
import { ComponentAddToolHandler } from './component/ComponentAddToolHandler.js';
import { ComponentRemoveToolHandler } from './component/ComponentRemoveToolHandler.js';
import { ComponentModifyToolHandler } from './component/ComponentModifyToolHandler.js';
import { ComponentListToolHandler } from './component/ComponentListToolHandler.js';
import { ComponentGetTypesToolHandler } from './component/ComponentGetTypesToolHandler.js';
import { CompilationGetStateToolHandler } from './compilation/CompilationGetStateToolHandler.js';
import { TestRunToolHandler } from './test/TestRunToolHandler.js';
import { TestGetStatusToolHandler } from './test/TestGetStatusToolHandler.js';
import { EditorTagsManageToolHandler } from './editor/EditorTagsManageToolHandler.js';
import { EditorLayersManageToolHandler } from './editor/EditorLayersManageToolHandler.js';
import { EditorSelectionManageToolHandler } from './editor/EditorSelectionManageToolHandler.js';
import { EditorWindowsManageToolHandler } from './editor/EditorWindowsManageToolHandler.js';
import { EditorToolsManageToolHandler } from './editor/EditorToolsManageToolHandler.js';
import { SettingsGetToolHandler } from './settings/SettingsGetToolHandler.js';
import { SettingsUpdateToolHandler } from './settings/SettingsUpdateToolHandler.js';
import PackageManagerToolHandler from './package/PackageManagerToolHandler.js';
import RegistryConfigToolHandler from './package/RegistryConfigToolHandler.js';
import { ScriptPackagesListToolHandler } from './script/ScriptPackagesListToolHandler.js';
import { ScriptReadToolHandler } from './script/ScriptReadToolHandler.js';
import { ScriptSearchToolHandler } from './script/ScriptSearchToolHandler.js';
import { ScriptEditStructuredToolHandler } from './script/ScriptEditStructuredToolHandler.js';
import { ScriptEditSnippetToolHandler } from './script/ScriptEditSnippetToolHandler.js';
import { ScriptSymbolsGetToolHandler } from './script/ScriptSymbolsGetToolHandler.js';
import { ScriptSymbolFindToolHandler } from './script/ScriptSymbolFindToolHandler.js';
import { ScriptRefsFindToolHandler } from './script/ScriptRefsFindToolHandler.js';
import { CodeIndexStatusToolHandler } from './script/CodeIndexStatusToolHandler.js';
import { ScriptRefactorRenameToolHandler } from './script/ScriptRefactorRenameToolHandler.js';
import { ScriptCreateClassToolHandler } from './script/ScriptCreateClassToolHandler.js';
import { ScriptRemoveSymbolToolHandler } from './script/ScriptRemoveSymbolToolHandler.js';
import { CodeIndexUpdateToolHandler } from './script/CodeIndexUpdateToolHandler.js';
import { CodeIndexBuildToolHandler } from './script/CodeIndexBuildToolHandler.js';
// Roslyn (external CLI) tool handlers removed（内部ユーティリティのみ存続）

// Terminal handlers
import { TerminalOpenToolHandler } from './terminal/TerminalOpenToolHandler.js';
import { TerminalExecuteToolHandler } from './terminal/TerminalExecuteToolHandler.js';
import { TerminalReadToolHandler } from './terminal/TerminalReadToolHandler.js';
import { TerminalCloseToolHandler } from './terminal/TerminalCloseToolHandler.js';

// AI session handlers
import { AiSessionOpenHandler } from './ai/AiSessionOpenHandler.js';
import { AiSessionMessageHandler } from './ai/AiSessionMessageHandler.js';
import { AiSessionExecuteHandler } from './ai/AiSessionExecuteHandler.js';
import { AiSessionCloseHandler } from './ai/AiSessionCloseHandler.js';

// Handler registry - single source of truth
const HANDLER_CLASSES = [
  // System handlers
  SystemPingToolHandler,
  SystemRefreshAssetsToolHandler,
  SystemGetCommandStatsToolHandler,
  
  // GameObject handlers
  GameObjectCreateToolHandler,
  GameObjectFindToolHandler,
  GameObjectModifyToolHandler,
  GameObjectDeleteToolHandler,
  GameObjectGetHierarchyToolHandler,
  
  // Scene handlers
  SceneCreateToolHandler,
  SceneLoadToolHandler,
  SceneSaveToolHandler,
  SceneListToolHandler,
  GetSceneInfoToolHandler,
  
  // Analysis handlers
  GetGameObjectDetailsToolHandler,
  AnalyzeSceneContentsToolHandler,
  GetComponentValuesToolHandler,
  FindByComponentToolHandler,
  GetObjectReferencesToolHandler,
  GetAnimatorStateToolHandler,
  GetAnimatorRuntimeInfoToolHandler,
  GetInputActionsStateToolHandler,
  AnalyzeInputActionsAssetToolHandler,
  
  // PlayMode handlers
  PlaymodePlayToolHandler,
  PlaymodePauseToolHandler,
  PlaymodeStopToolHandler,
  PlaymodeGetStateToolHandler,
  PlaymodeWaitForStateToolHandler,
  
  // UI handlers
  UIFindElementsToolHandler,
  UIClickElementToolHandler,
  UIGetElementStateToolHandler,
  UISetElementValueToolHandler,
  UISimulateInputToolHandler,
  
  // Input System handlers
  InputSystemControlToolHandler,
  InputKeyboardSimulateToolHandler,
  InputMouseSimulateToolHandler,
  InputGamepadSimulateToolHandler,
  InputTouchSimulateToolHandler,
  InputActionMapCreateToolHandler,
  InputActionMapRemoveToolHandler,
  InputActionAddToolHandler,
  InputActionRemoveToolHandler,
  InputBindingAddToolHandler,
  InputBindingRemoveToolHandler,
  InputBindingRemoveAllToolHandler,
  InputBindingCompositeCreateToolHandler,
  InputControlSchemesManageToolHandler,
  
  // Asset handlers
  AssetPrefabCreateToolHandler,
  AssetPrefabModifyToolHandler,
  AssetPrefabInstantiateToolHandler,
  AssetMaterialCreateToolHandler,
  AssetMaterialModifyToolHandler,
  AssetPrefabOpenToolHandler,
  AssetPrefabExitModeToolHandler,
  AssetPrefabSaveToolHandler,
  AssetImportSettingsManageToolHandler,
  AssetDatabaseManageToolHandler,
  AssetDependencyAnalyzeToolHandler,
  
  // Menu handlers
  MenuItemExecuteToolHandler,
  
  // Console handlers
  ConsoleClearToolHandler,
  ConsoleReadToolHandler,
  
  // Screenshot handlers
  ScreenshotCaptureToolHandler,
  ScreenshotAnalyzeToolHandler,
  // Video handlers
  VideoCaptureStartToolHandler,
  VideoCaptureStopToolHandler,
  VideoCaptureStatusToolHandler,
  VideoCaptureForToolHandler,
  // Script handlers
  ScriptPackagesListToolHandler,
  ScriptReadToolHandler,
  ScriptSearchToolHandler,
  ScriptEditStructuredToolHandler,
  ScriptEditSnippetToolHandler,
  ScriptRefsFindToolHandler,
  ScriptSymbolFindToolHandler,
  ScriptSymbolsGetToolHandler,
  CodeIndexStatusToolHandler,
  ScriptRefactorRenameToolHandler,
  ScriptCreateClassToolHandler,
  ScriptRemoveSymbolToolHandler,
  CodeIndexUpdateToolHandler,
  CodeIndexBuildToolHandler,
  
  
  // Component handlers
  ComponentAddToolHandler,
  ComponentRemoveToolHandler,
  ComponentModifyToolHandler,
  ComponentListToolHandler,
  ComponentGetTypesToolHandler,
  
  // Compilation handlers
  CompilationGetStateToolHandler,

  // Test handlers
  TestRunToolHandler,
  TestGetStatusToolHandler,

  // Terminal handlers
  TerminalOpenToolHandler,
  TerminalExecuteToolHandler,
  TerminalReadToolHandler,
  TerminalCloseToolHandler,
  AiSessionOpenHandler,
  AiSessionMessageHandler,
  AiSessionExecuteHandler,
  AiSessionCloseHandler,

  // Editor control handlers
  EditorTagsManageToolHandler,
  EditorLayersManageToolHandler,
  EditorSelectionManageToolHandler,
  EditorWindowsManageToolHandler,
  EditorToolsManageToolHandler,
  
  // Settings handlers
  SettingsGetToolHandler,
  SettingsUpdateToolHandler,
  
  // Package management handlers
  PackageManagerToolHandler,
  RegistryConfigToolHandler
];

/**
 * Creates and returns all tool handlers
 * @param {UnityConnection} unityConnection - Connection to Unity
 * @returns {Map<string, BaseToolHandler>} Map of tool name to handler
 */
export function createHandlers(unityConnection) {
  const handlers = new Map();
  const failedHandlers = [];
  
  // Instantiate all handlers from the registry
  for (const HandlerClass of HANDLER_CLASSES) {
    try {
      const handler = new HandlerClass(unityConnection);
      handlers.set(handler.name, handler);
    } catch (error) {
      failedHandlers.push(HandlerClass.name);
      console.error(`[MCP] Failed to create handler ${HandlerClass.name}:`, error.message);
      // Continue with other handlers instead of throwing
    }
  }
  
  if (failedHandlers.length > 0) {
    console.error(`[MCP] Failed to initialize ${failedHandlers.length} handlers: ${failedHandlers.join(', ')}`);
  }
  
  console.error(`[MCP] Successfully initialized ${handlers.size}/${HANDLER_CLASSES.length} handlers`);
  
  return handlers;
}
