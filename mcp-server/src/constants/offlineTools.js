/**
 * List of tools that work without Unity connection.
 * These tools use only the local C# LSP and file system.
 */
export const OFFLINE_TOOLS = [
  'get_code_index_status',
  'build_code_index',
  'update_code_index',
  'get_script_symbols',
  'find_script_symbol',
  'find_script_refs',
  'read_script',
  'search_script',
  'list_script_packages'
];

export const OFFLINE_TOOLS_HINT =
  'Code index and script analysis tools work without Unity connection. ' +
  'Use these tools for C# code exploration, symbol search, and editing.';
