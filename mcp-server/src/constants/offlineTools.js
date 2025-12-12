/**
 * List of tools that work without Unity connection.
 * These tools use only the local C# LSP and file system.
 */
export const OFFLINE_TOOLS = [
  'code_index_status',
  'code_index_build',
  'code_index_update',
  'script_symbols_get',
  'script_symbol_find',
  'script_refs_find',
  'script_read',
  'script_search',
  'script_packages_list'
];

export const OFFLINE_TOOLS_HINT =
  'Code index and script analysis tools work without Unity connection. ' +
  'Use these tools for C# code exploration, symbol search, and editing.';
