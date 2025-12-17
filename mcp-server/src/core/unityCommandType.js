const TOOL_NAME_TO_UNITY_COMMAND_TYPE = Object.freeze({
  // Legacy MCP tool names -> Unity command type (TCP)
  analysis_animator_state_get: 'get_animator_state',
  analysis_animator_runtime_info_get: 'get_animator_runtime_info',

  analysis_component_find: 'find_by_component',
  analysis_component_values_get: 'get_component_values',
  analysis_gameobject_details_get: 'get_gameobject_details',
  analysis_object_references_get: 'get_object_references',
  analysis_scene_contents_analyze: 'analyze_scene_contents',

  asset_database_manage: 'manage_asset_database',
  asset_dependency_analyze: 'analyze_asset_dependencies',
  asset_import_settings_manage: 'manage_asset_import_settings',
  asset_material_create: 'create_material',
  asset_material_modify: 'modify_material',
  asset_prefab_create: 'create_prefab',
  asset_prefab_exit_mode: 'exit_prefab_mode',
  asset_prefab_instantiate: 'instantiate_prefab',
  asset_prefab_modify: 'modify_prefab',
  asset_prefab_open: 'open_prefab',
  asset_prefab_save: 'save_prefab',

  compilation_get_state: 'get_compilation_state',

  component_add: 'add_component',
  component_field_set: 'set_component_field',
  component_get_types: 'get_component_types',
  component_list: 'list_components',
  component_modify: 'modify_component',
  component_remove: 'remove_component',

  console_clear: 'clear_console',
  console_read: 'read_console',

  editor_layers_manage: 'manage_layers',
  editor_quit: 'quit_editor',
  editor_selection_manage: 'manage_selection',
  editor_tags_manage: 'manage_tags',
  editor_tools_manage: 'manage_tools',
  editor_windows_manage: 'manage_windows',

  gameobject_create: 'create_gameobject',
  gameobject_delete: 'delete_gameobject',
  gameobject_find: 'find_gameobject',
  gameobject_get_hierarchy: 'get_hierarchy',
  gameobject_modify: 'modify_gameobject',

  input_action_add: 'add_input_action',
  input_action_map_create: 'create_action_map',
  input_action_map_remove: 'remove_action_map',
  input_action_remove: 'remove_input_action',
  input_actions_asset_analyze: 'analyze_input_actions_asset',
  input_actions_state_get: 'get_input_actions_state',
  input_binding_add: 'add_input_binding',
  input_binding_composite_create: 'create_composite_binding',
  input_binding_remove: 'remove_input_binding',
  input_binding_remove_all: 'remove_all_bindings',
  remove_input_binding_all: 'remove_all_bindings',
  input_control_schemes_manage: 'manage_control_schemes',

  menu_item_execute: 'execute_menu_item',

  package_manage: 'package_manager',
  package_registry_config: 'registry_config',

  playmode_get_state: 'get_editor_state',
  playmode_pause: 'pause_game',
  playmode_play: 'play_game',
  playmode_stop: 'stop_game',

  scene_create: 'create_scene',
  scene_info_get: 'get_scene_info',
  scene_list: 'list_scenes',
  scene_load: 'load_scene',
  scene_save: 'save_scene',

  screenshot_analyze: 'analyze_screenshot',
  screenshot_capture: 'capture_screenshot',

  settings_get: 'get_project_settings',
  settings_update: 'update_project_settings',

  system_get_command_stats: 'get_command_stats',
  system_ping: 'ping',
  system_refresh_assets: 'refresh_assets',

  test_get_status: 'get_test_status',
  test_run: 'run_tests',

  ui_click_element: 'click_ui_element',
  ui_find_elements: 'find_ui_elements',
  ui_get_element_state: 'get_ui_element_state',
  ui_set_element_value: 'set_ui_element_value',
  ui_simulate_input: 'simulate_ui_input',

  video_capture_start: 'capture_video_start',
  video_capture_status: 'capture_video_status',
  video_capture_stop: 'capture_video_stop'
});

export function normalizeUnityCommandType(type) {
  if (typeof type !== 'string' || type.length === 0) return type;
  return TOOL_NAME_TO_UNITY_COMMAND_TYPE[type] ?? type;
}
