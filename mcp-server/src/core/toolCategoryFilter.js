/**
 * Tool category filtering for tools/list and tools/call visibility control.
 */

const CATEGORY_NAMES = Object.freeze([
  'system',
  'gameobject',
  'scene',
  'analysis',
  'playmode',
  'ui',
  'input',
  'asset',
  'prefab',
  'material',
  'addressables',
  'menu',
  'console',
  'screenshot',
  'video',
  'component',
  'compilation',
  'test',
  'editor',
  'settings',
  'package',
  'script',
  'profiler',
  'general'
]);

function toCategoryKey(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

const CATEGORY_KEY_TO_NAME = new Map(CATEGORY_NAMES.map(name => [toCategoryKey(name), name]));

// User-friendly aliases
CATEGORY_KEY_TO_NAME.set('addressable', 'addressables');
CATEGORY_KEY_TO_NAME.set('gameobj', 'gameobject');
CATEGORY_KEY_TO_NAME.set('play', 'playmode');
CATEGORY_KEY_TO_NAME.set('playmode', 'playmode');
CATEGORY_KEY_TO_NAME.set('uitoolkit', 'ui');
CATEGORY_KEY_TO_NAME.set('ugui', 'ui');
CATEGORY_KEY_TO_NAME.set('imgui', 'ui');

const SYSTEM_TOOLS = new Set([
  'ping',
  'refresh_assets',
  'get_command_stats',
  'get_server_info',
  'search_tools'
]);

const GAMEOBJECT_TOOLS = new Set([
  'create_gameobject',
  'find_gameobject',
  'modify_gameobject',
  'delete_gameobject',
  'get_hierarchy'
]);

const SCENE_TOOLS = new Set(['create_scene', 'load_scene', 'save_scene', 'list_scenes', 'get_scene_info']);

const ANALYSIS_TOOLS = new Set([
  'get_gameobject_details',
  'analyze_scene_contents',
  'get_component_values',
  'find_by_component',
  'get_object_references',
  'get_animator_state',
  'get_animator_runtime_info',
  'get_input_actions_state',
  'analyze_input_actions_asset'
]);

const PLAYMODE_TOOLS = new Set(['play_game', 'pause_game', 'stop_game', 'playmode_wait_for_state']);

const UI_TOOLS = new Set([
  'find_ui_elements',
  'click_ui_element',
  'get_ui_element_state',
  'set_ui_element_value',
  'simulate_ui_input'
]);

const INPUT_TOOLS = new Set([
  'input_system_control',
  'input_keyboard',
  'input_mouse',
  'input_gamepad',
  'input_touch',
  'create_action_map',
  'remove_action_map',
  'add_input_action',
  'remove_input_action',
  'add_input_binding',
  'remove_input_binding',
  'remove_all_bindings',
  'create_composite_binding',
  'manage_control_schemes'
]);

const ASSET_TOOLS = new Set([
  'manage_asset_database',
  'manage_asset_import_settings',
  'analyze_asset_dependencies'
]);

const PREFAB_TOOLS = new Set([
  'create_prefab',
  'modify_prefab',
  'instantiate_prefab',
  'open_prefab',
  'exit_prefab_mode',
  'save_prefab'
]);

const MATERIAL_TOOLS = new Set(['create_material', 'modify_material']);

const MENU_TOOLS = new Set(['execute_menu_item']);
const CONSOLE_TOOLS = new Set(['clear_console', 'read_console']);
const SCREENSHOT_TOOLS = new Set(['capture_screenshot', 'analyze_screenshot']);
const VIDEO_TOOLS = new Set([
  'capture_video_start',
  'capture_video_stop',
  'capture_video_status',
  'video_capture_for'
]);
const COMPONENT_TOOLS = new Set([
  'add_component',
  'remove_component',
  'modify_component',
  'list_components',
  'get_component_types',
  'set_component_field'
]);
const COMPILATION_TOOLS = new Set(['get_compilation_state']);
const TEST_TOOLS = new Set(['run_tests', 'get_test_status']);
const EDITOR_TOOLS = new Set([
  'manage_tags',
  'manage_layers',
  'manage_selection',
  'manage_windows',
  'manage_tools',
  'get_editor_state',
  'quit_editor'
]);
const SETTINGS_TOOLS = new Set(['get_project_settings', 'update_project_settings']);
const PACKAGE_TOOLS = new Set(['package_manager', 'registry_config', 'list_packages']);
const SCRIPT_TOOLS = new Set([
  'read',
  'search',
  'edit_structured',
  'edit_snippet',
  'get_symbols',
  'find_symbol',
  'find_refs',
  'build_index',
  'update_index',
  'get_index_status',
  'rename_symbol',
  'create_class',
  'remove_symbol'
]);

const TOOL_SETS = [
  ['system', SYSTEM_TOOLS],
  ['gameobject', GAMEOBJECT_TOOLS],
  ['scene', SCENE_TOOLS],
  ['analysis', ANALYSIS_TOOLS],
  ['playmode', PLAYMODE_TOOLS],
  ['ui', UI_TOOLS],
  ['input', INPUT_TOOLS],
  ['asset', ASSET_TOOLS],
  ['prefab', PREFAB_TOOLS],
  ['material', MATERIAL_TOOLS],
  ['menu', MENU_TOOLS],
  ['console', CONSOLE_TOOLS],
  ['screenshot', SCREENSHOT_TOOLS],
  ['video', VIDEO_TOOLS],
  ['component', COMPONENT_TOOLS],
  ['compilation', COMPILATION_TOOLS],
  ['test', TEST_TOOLS],
  ['editor', EDITOR_TOOLS],
  ['settings', SETTINGS_TOOLS],
  ['package', PACKAGE_TOOLS],
  ['script', SCRIPT_TOOLS]
];

function logWarning(logger, message) {
  if (!logger) return;
  if (typeof logger.warning === 'function') {
    logger.warning(message);
    return;
  }
  if (typeof logger.warn === 'function') {
    logger.warn(message);
    return;
  }
  if (typeof logger.info === 'function') {
    logger.info(message);
  }
}

function normalizeCategoryList(rawValues = []) {
  const values = Array.isArray(rawValues) ? rawValues : [];
  const normalized = [];
  const unknown = [];
  const seen = new Set();

  for (const value of values) {
    const key = toCategoryKey(value);
    if (!key) continue;
    const category = CATEGORY_KEY_TO_NAME.get(key);
    if (!category) {
      unknown.push(String(value).trim());
      continue;
    }
    if (seen.has(category)) continue;
    seen.add(category);
    normalized.push(category);
  }

  return { normalized, unknown };
}

export function getToolCategory(toolName) {
  const name = typeof toolName === 'string' ? toolName : '';
  if (!name) return 'general';
  if (name.startsWith('addressables_')) return 'addressables';
  if (name.startsWith('profiler_')) return 'profiler';

  for (const [category, set] of TOOL_SETS) {
    if (set.has(name)) return category;
  }

  return 'general';
}

export function createToolCategoryPolicy(config = {}, logger) {
  const includeResult = normalizeCategoryList(config.includeCategories);
  const excludeResult = normalizeCategoryList(config.excludeCategories);

  if (includeResult.unknown.length > 0) {
    logWarning(
      logger,
      `[tool-filter] Ignoring unknown include categories: ${includeResult.unknown.join(', ')}`
    );
  }
  if (excludeResult.unknown.length > 0) {
    logWarning(
      logger,
      `[tool-filter] Ignoring unknown exclude categories: ${excludeResult.unknown.join(', ')}`
    );
  }

  return {
    includeCategories: new Set(includeResult.normalized),
    excludeCategories: new Set(excludeResult.normalized),
    includeList: includeResult.normalized,
    excludeList: excludeResult.normalized,
    isActive: includeResult.normalized.length > 0 || excludeResult.normalized.length > 0
  };
}

export function filterToolsByCategory(tools, policy) {
  const list = Array.isArray(tools) ? tools : [];
  const publicTools = [];
  const hiddenToolNames = new Set();
  const publicToolNames = new Set();
  const includeCategories = policy?.includeCategories ?? new Set();
  const excludeCategories = policy?.excludeCategories ?? new Set();
  const includeEnabled = includeCategories.size > 0;
  const excludeEnabled = excludeCategories.size > 0;

  for (const tool of list) {
    const name = tool?.name;
    if (typeof name !== 'string' || name.length === 0) {
      continue;
    }

    const category = getToolCategory(name);
    const includeMatch = !includeEnabled || includeCategories.has(category);
    const excludeMatch = excludeEnabled && excludeCategories.has(category);
    const visible = includeMatch && !excludeMatch;

    if (visible) {
      publicTools.push(tool);
      publicToolNames.add(name);
    } else {
      hiddenToolNames.add(name);
    }
  }

  return {
    tools: publicTools,
    publicToolNames,
    hiddenToolNames
  };
}

export function getKnownToolCategories() {
  return [...CATEGORY_NAMES];
}
