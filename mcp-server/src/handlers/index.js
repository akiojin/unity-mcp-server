/**
 * Central export and registration for all tool handlers
 */

// Export all handlers
export { BaseToolHandler } from './base/BaseToolHandler.js';

// System handlers
export { PingToolHandler } from './system/PingToolHandler.js';
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
export { GetAnimatorStateToolHandler, GetAnimatorRuntimeInfoToolHandler } from './analysis/GetAnimatorStateToolHandler.js';
export { GetInputActionsStateToolHandler, AnalyzeInputActionsAssetToolHandler } from './analysis/GetInputActionsStateToolHandler.js';

// PlayMode handlers
export { PlayToolHandler } from './playmode/PlayToolHandler.js';
export { PauseToolHandler } from './playmode/PauseToolHandler.js';
export { StopToolHandler } from './playmode/StopToolHandler.js';
export { GetEditorStateToolHandler } from './playmode/GetEditorStateToolHandler.js';
export { WaitForEditorStateToolHandler } from './playmode/WaitForEditorStateToolHandler.js';

// UI handlers
export { FindUIElementsToolHandler } from './ui/FindUIElementsToolHandler.js';
export { ClickUIElementToolHandler } from './ui/ClickUIElementToolHandler.js';
export { GetUIElementStateToolHandler } from './ui/GetUIElementStateToolHandler.js';
export { SetUIElementValueToolHandler } from './ui/SetUIElementValueToolHandler.js';
export { SimulateUIInputToolHandler } from './ui/SimulateUIInputToolHandler.js';

// Input System handlers
export { InputSystemHandler } from './input/InputSystemHandler.js';
export { KeyboardSimulationHandler } from './input/KeyboardSimulationHandler.js';
export { MouseSimulationHandler } from './input/MouseSimulationHandler.js';
export { GamepadSimulationHandler } from './input/GamepadSimulationHandler.js';
export { TouchSimulationHandler } from './input/TouchSimulationHandler.js';
export { CreateActionMapToolHandler } from './input/CreateActionMapToolHandler.js';
export { RemoveActionMapToolHandler } from './input/RemoveActionMapToolHandler.js';
export { AddInputActionToolHandler } from './input/AddInputActionToolHandler.js';
export { RemoveInputActionToolHandler } from './input/RemoveInputActionToolHandler.js';
export { AddInputBindingToolHandler } from './input/AddInputBindingToolHandler.js';
export { RemoveInputBindingToolHandler } from './input/RemoveInputBindingToolHandler.js';
export { RemoveAllBindingsToolHandler } from './input/RemoveAllBindingsToolHandler.js';
export { CreateCompositeBindingToolHandler } from './input/CreateCompositeBindingToolHandler.js';
export { ManageControlSchemesToolHandler } from './input/ManageControlSchemesToolHandler.js';

// Asset handlers
export { CreatePrefabToolHandler } from './asset/CreatePrefabToolHandler.js';
export { ModifyPrefabToolHandler } from './asset/ModifyPrefabToolHandler.js';
export { InstantiatePrefabToolHandler } from './asset/InstantiatePrefabToolHandler.js';
export { CreateMaterialToolHandler } from './asset/CreateMaterialToolHandler.js';
export { ModifyMaterialToolHandler } from './asset/ModifyMaterialToolHandler.js';
export { OpenPrefabToolHandler } from './asset/OpenPrefabToolHandler.js';
export { ExitPrefabModeToolHandler } from './asset/ExitPrefabModeToolHandler.js';
export { SavePrefabToolHandler } from './asset/SavePrefabToolHandler.js';
export { AssetImportSettingsToolHandler } from './asset/AssetImportSettingsToolHandler.js';
export { AssetDatabaseToolHandler } from './asset/AssetDatabaseToolHandler.js';
export { AssetDependencyToolHandler } from './asset/AssetDependencyToolHandler.js';

// Menu handlers
export { ExecuteMenuItemToolHandler } from './menu/ExecuteMenuItemToolHandler.js';

// Console handlers
export { ClearConsoleToolHandler } from './console/ClearConsoleToolHandler.js';
export { ReadConsoleToolHandler } from './console/ReadConsoleToolHandler.js';

// Screenshot handlers
export { CaptureScreenshotToolHandler } from './screenshot/CaptureScreenshotToolHandler.js';
export { AnalyzeScreenshotToolHandler } from './screenshot/AnalyzeScreenshotToolHandler.js';

// Component handlers
export { AddComponentToolHandler } from './component/AddComponentToolHandler.js';
export { RemoveComponentToolHandler } from './component/RemoveComponentToolHandler.js';
export { ModifyComponentToolHandler } from './component/ModifyComponentToolHandler.js';
export { ListComponentsToolHandler } from './component/ListComponentsToolHandler.js';
export { GetComponentTypesToolHandler } from './component/GetComponentTypesToolHandler.js';

// Compilation handlers
export { StartCompilationMonitoringToolHandler } from './compilation/StartCompilationMonitoringToolHandler.js';
export { StopCompilationMonitoringToolHandler } from './compilation/StopCompilationMonitoringToolHandler.js';
export { GetCompilationStateToolHandler } from './compilation/GetCompilationStateToolHandler.js';

// Editor control handlers
export { TagManagementToolHandler } from './editor/TagManagementToolHandler.js';
export { LayerManagementToolHandler } from './editor/LayerManagementToolHandler.js';
export { SelectionToolHandler } from './editor/SelectionToolHandler.js';
export { WindowManagementToolHandler } from './editor/WindowManagementToolHandler.js';
export { ToolManagementToolHandler } from './editor/ToolManagementToolHandler.js';

// Settings handlers
export { GetProjectSettingsToolHandler } from './settings/GetProjectSettingsToolHandler.js';
export { UpdateProjectSettingsToolHandler } from './settings/UpdateProjectSettingsToolHandler.js';

// Package management handlers
export { default as PackageManagerToolHandler } from './package/PackageManagerToolHandler.js';
export { default as RegistryConfigToolHandler } from './package/RegistryConfigToolHandler.js';

// Script handlers
export { ScriptPackagesListToolHandler } from './script/ScriptPackagesListToolHandler.js';
export { ScriptReadToolHandler } from './script/ScriptReadToolHandler.js';
export { ScriptSearchToolHandler } from './script/ScriptSearchToolHandler.js';
export { ScriptEditStructuredToolHandler } from './script/ScriptEditStructuredToolHandler.js';
export { ScriptRefsFindToolHandler } from './script/ScriptRefsFindToolHandler.js';
export { ScriptSymbolFindToolHandler } from './script/ScriptSymbolFindToolHandler.js';
export { ScriptSymbolsGetToolHandler } from './script/ScriptSymbolsGetToolHandler.js';
export { ScriptIndexStatusToolHandler } from './script/ScriptIndexStatusToolHandler.js';
export { ScriptRefactorRenameToolHandler } from './script/ScriptRefactorRenameToolHandler.js';
// Deprecated Unity-communication handlers removed: ScriptEditPatchToolHandler, ScriptReplacePatternToolHandler
// Roslyn CLI (external)
export { RoslynFindSymbolToolHandler } from './roslyn/RoslynFindSymbolToolHandler.js';
export { RoslynFindReferencesToolHandler } from './roslyn/RoslynFindReferencesToolHandler.js';
export { RoslynReplaceSymbolBodyToolHandler } from './roslyn/RoslynReplaceSymbolBodyToolHandler.js';
export { RoslynInsertSymbolToolHandler } from './roslyn/RoslynInsertSymbolToolHandler.js';

// Import all handler classes at once
import { PingToolHandler } from './system/PingToolHandler.js';
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
import { GetAnimatorStateToolHandler, GetAnimatorRuntimeInfoToolHandler } from './analysis/GetAnimatorStateToolHandler.js';
import { GetInputActionsStateToolHandler, AnalyzeInputActionsAssetToolHandler } from './analysis/GetInputActionsStateToolHandler.js';
import { PlayToolHandler } from './playmode/PlayToolHandler.js';
import { PauseToolHandler } from './playmode/PauseToolHandler.js';
import { StopToolHandler } from './playmode/StopToolHandler.js';
import { GetEditorStateToolHandler } from './playmode/GetEditorStateToolHandler.js';
import { WaitForEditorStateToolHandler } from './playmode/WaitForEditorStateToolHandler.js';
import { FindUIElementsToolHandler } from './ui/FindUIElementsToolHandler.js';
import { ClickUIElementToolHandler } from './ui/ClickUIElementToolHandler.js';
import { GetUIElementStateToolHandler } from './ui/GetUIElementStateToolHandler.js';
import { SetUIElementValueToolHandler } from './ui/SetUIElementValueToolHandler.js';
import { SimulateUIInputToolHandler } from './ui/SimulateUIInputToolHandler.js';
import { InputSystemHandler } from './input/InputSystemHandler.js';
import { KeyboardSimulationHandler } from './input/KeyboardSimulationHandler.js';
import { MouseSimulationHandler } from './input/MouseSimulationHandler.js';
import { GamepadSimulationHandler } from './input/GamepadSimulationHandler.js';
import { TouchSimulationHandler } from './input/TouchSimulationHandler.js';
import { CreateActionMapToolHandler } from './input/CreateActionMapToolHandler.js';
import { RemoveActionMapToolHandler } from './input/RemoveActionMapToolHandler.js';
import { AddInputActionToolHandler } from './input/AddInputActionToolHandler.js';
import { RemoveInputActionToolHandler } from './input/RemoveInputActionToolHandler.js';
import { AddInputBindingToolHandler } from './input/AddInputBindingToolHandler.js';
import { RemoveInputBindingToolHandler } from './input/RemoveInputBindingToolHandler.js';
import { RemoveAllBindingsToolHandler } from './input/RemoveAllBindingsToolHandler.js';
import { CreateCompositeBindingToolHandler } from './input/CreateCompositeBindingToolHandler.js';
import { ManageControlSchemesToolHandler } from './input/ManageControlSchemesToolHandler.js';
import { CreatePrefabToolHandler } from './asset/CreatePrefabToolHandler.js';
import { ModifyPrefabToolHandler } from './asset/ModifyPrefabToolHandler.js';
import { InstantiatePrefabToolHandler } from './asset/InstantiatePrefabToolHandler.js';
import { CreateMaterialToolHandler } from './asset/CreateMaterialToolHandler.js';
import { ModifyMaterialToolHandler } from './asset/ModifyMaterialToolHandler.js';
import { OpenPrefabToolHandler } from './asset/OpenPrefabToolHandler.js';
import { ExitPrefabModeToolHandler } from './asset/ExitPrefabModeToolHandler.js';
import { SavePrefabToolHandler } from './asset/SavePrefabToolHandler.js';
import { AssetImportSettingsToolHandler } from './asset/AssetImportSettingsToolHandler.js';
import { AssetDatabaseToolHandler } from './asset/AssetDatabaseToolHandler.js';
import { AssetDependencyToolHandler } from './asset/AssetDependencyToolHandler.js';
import { ExecuteMenuItemToolHandler } from './menu/ExecuteMenuItemToolHandler.js';
import { ClearConsoleToolHandler } from './console/ClearConsoleToolHandler.js';
import { ReadConsoleToolHandler } from './console/ReadConsoleToolHandler.js';
import { CaptureScreenshotToolHandler } from './screenshot/CaptureScreenshotToolHandler.js';
import { AnalyzeScreenshotToolHandler } from './screenshot/AnalyzeScreenshotToolHandler.js';
import { AddComponentToolHandler } from './component/AddComponentToolHandler.js';
import { RemoveComponentToolHandler } from './component/RemoveComponentToolHandler.js';
import { ModifyComponentToolHandler } from './component/ModifyComponentToolHandler.js';
import { ListComponentsToolHandler } from './component/ListComponentsToolHandler.js';
import { GetComponentTypesToolHandler } from './component/GetComponentTypesToolHandler.js';
import { StartCompilationMonitoringToolHandler } from './compilation/StartCompilationMonitoringToolHandler.js';
import { StopCompilationMonitoringToolHandler } from './compilation/StopCompilationMonitoringToolHandler.js';
import { GetCompilationStateToolHandler } from './compilation/GetCompilationStateToolHandler.js';
import { TagManagementToolHandler } from './editor/TagManagementToolHandler.js';
import { LayerManagementToolHandler } from './editor/LayerManagementToolHandler.js';
import { SelectionToolHandler } from './editor/SelectionToolHandler.js';
import { WindowManagementToolHandler } from './editor/WindowManagementToolHandler.js';
import { ToolManagementToolHandler } from './editor/ToolManagementToolHandler.js';
import { GetProjectSettingsToolHandler } from './settings/GetProjectSettingsToolHandler.js';
import { UpdateProjectSettingsToolHandler } from './settings/UpdateProjectSettingsToolHandler.js';
import PackageManagerToolHandler from './package/PackageManagerToolHandler.js';
import RegistryConfigToolHandler from './package/RegistryConfigToolHandler.js';
import { ScriptPackagesListToolHandler } from './script/ScriptPackagesListToolHandler.js';
import { ScriptReadToolHandler } from './script/ScriptReadToolHandler.js';
import { ScriptSearchToolHandler } from './script/ScriptSearchToolHandler.js';
import { ScriptEditPatchToolHandler } from './script/ScriptEditPatchToolHandler.js';
import { ScriptEditStructuredToolHandler } from './script/ScriptEditStructuredToolHandler.js';
import { ScriptReplacePatternToolHandler } from './script/ScriptReplacePatternToolHandler.js';
import { ScriptSymbolsGetToolHandler } from './script/ScriptSymbolsGetToolHandler.js';
import { ScriptSymbolFindToolHandler } from './script/ScriptSymbolFindToolHandler.js';
import { ScriptRefsFindToolHandler } from './script/ScriptRefsFindToolHandler.js';
import { ScriptIndexStatusToolHandler } from './script/ScriptIndexStatusToolHandler.js';
import { ScriptRefactorRenameToolHandler } from './script/ScriptRefactorRenameToolHandler.js';

// Handler registry - single source of truth
const HANDLER_CLASSES = [
  // System handlers
  PingToolHandler,
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
  GetAnimatorStateToolHandler,
  GetAnimatorRuntimeInfoToolHandler,
  GetInputActionsStateToolHandler,
  AnalyzeInputActionsAssetToolHandler,
  
  // PlayMode handlers
  PlayToolHandler,
  PauseToolHandler,
  StopToolHandler,
  GetEditorStateToolHandler,
  WaitForEditorStateToolHandler,
  
  // UI handlers
  FindUIElementsToolHandler,
  ClickUIElementToolHandler,
  GetUIElementStateToolHandler,
  SetUIElementValueToolHandler,
  SimulateUIInputToolHandler,
  
  // Input System handlers
  InputSystemHandler,
  KeyboardSimulationHandler,
  MouseSimulationHandler,
  GamepadSimulationHandler,
  TouchSimulationHandler,
  CreateActionMapToolHandler,
  RemoveActionMapToolHandler,
  AddInputActionToolHandler,
  RemoveInputActionToolHandler,
  AddInputBindingToolHandler,
  RemoveInputBindingToolHandler,
  RemoveAllBindingsToolHandler,
  CreateCompositeBindingToolHandler,
  ManageControlSchemesToolHandler,
  
  // Asset handlers
  CreatePrefabToolHandler,
  ModifyPrefabToolHandler,
  InstantiatePrefabToolHandler,
  CreateMaterialToolHandler,
  ModifyMaterialToolHandler,
  OpenPrefabToolHandler,
  ExitPrefabModeToolHandler,
  SavePrefabToolHandler,
  AssetImportSettingsToolHandler,
  AssetDatabaseToolHandler,
  AssetDependencyToolHandler,
  
  // Menu handlers
  ExecuteMenuItemToolHandler,
  
  // Console handlers
  ClearConsoleToolHandler,
  ReadConsoleToolHandler,
  
  // Screenshot handlers
  CaptureScreenshotToolHandler,
  AnalyzeScreenshotToolHandler,
  // Script handlers
  ScriptPackagesListToolHandler,
  ScriptReadToolHandler,
  ScriptSearchToolHandler,
  ScriptEditStructuredToolHandler,
  ScriptRefsFindToolHandler,
  ScriptSymbolFindToolHandler,
  ScriptSymbolsGetToolHandler,
  ScriptIndexStatusToolHandler,
  ScriptRefactorRenameToolHandler,
  // Roslyn CLI handlers (external)
  RoslynFindSymbolToolHandler,
  RoslynFindReferencesToolHandler,
  RoslynReplaceSymbolBodyToolHandler,
  RoslynInsertSymbolToolHandler,
  
  // Component handlers
  AddComponentToolHandler,
  RemoveComponentToolHandler,
  ModifyComponentToolHandler,
  ListComponentsToolHandler,
  GetComponentTypesToolHandler,
  
  // Compilation handlers
  StartCompilationMonitoringToolHandler,
  StopCompilationMonitoringToolHandler,
  GetCompilationStateToolHandler,
  
  // Editor control handlers
  TagManagementToolHandler,
  LayerManagementToolHandler,
  SelectionToolHandler,
  WindowManagementToolHandler,
  ToolManagementToolHandler,
  
  // Settings handlers
  GetProjectSettingsToolHandler,
  UpdateProjectSettingsToolHandler,
  
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
  
  // Instantiate all handlers from the registry
  for (const HandlerClass of HANDLER_CLASSES) {
    const handler = new HandlerClass(unityConnection);
    handlers.set(handler.name, handler);
  }
  
  return handlers;
}
