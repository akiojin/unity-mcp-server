/**
 * List of tools that work without Unity connection.
 * These tools use only the local C# LSP and file system.
 */
export const OFFLINE_TOOLS = [
  'get_index_status',
  'build_index',
  'update_index',
  'get_symbols',
  'find_symbol',
  'find_refs',
  'read',
  'search',
  'list_packages'
];

export const OFFLINE_TOOLS_HINT =
  'Code index and script analysis tools work without Unity connection. ' +
  'Use these tools for C# code exploration, symbol search, and editing.';
