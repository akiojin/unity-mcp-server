const TOOL_NAME_TO_UNITY_COMMAND_TYPE = Object.freeze({
  // Legacy MCP tool names -> Unity command type (TCP)
  analysis_animator_state_get: 'get_animator_state',
  analysis_animator_runtime_info_get: 'get_animator_runtime_info'
});

export function normalizeUnityCommandType(type) {
  if (typeof type !== 'string' || type.length === 0) return type;
  return TOOL_NAME_TO_UNITY_COMMAND_TYPE[type] ?? type;
}
