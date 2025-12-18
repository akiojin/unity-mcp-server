import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function loadJson(jsonPath) {
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to load JSON: ${jsonPath}\n${error.message}`, { cause: error });
  }
}

function loadToolManifest(repoRootDir) {
  const manifestPath = path.join(repoRootDir, 'mcp-server', 'src', 'core', 'toolManifest.json');
  return loadJson(manifestPath);
}

function loadUnityCommandTypes(repoRootDir) {
  const serverPath = path.join(
    repoRootDir,
    'UnityMCPServer',
    'Packages',
    'unity-mcp-server',
    'Editor',
    'Core',
    'UnityMCPServer.cs'
  );

  const source = fs.readFileSync(serverPath, 'utf8');
  const matches = Array.from(source.matchAll(/case\s+"([^"]+)"\s*:/g), m => m[1]);
  return new Set(matches);
}

function isAllowedNonUnityToolName(name) {
  if (name === 'search_tools') return true;
  if (name === 'input_system_control') return true;
  if (name === 'playmode_wait_for_state') return true;
  if (name === 'video_capture_for') return true;
  // Script tools (verb-first naming: read_script, edit_script_*, find_script_*, etc.)
  if (name.includes('_script')) return true;
  // Code index tools (verb-first naming: build_code_index, get_code_index_status, update_code_index)
  if (name.includes('code_index')) return true;
  return false;
}

describe('toolManifest (tool name alignment)', () => {
  it('should use Unity command types as tool names (except explicitly allowed non-Unity tools)', () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const repoRootDir = path.resolve(__dirname, '../../../../');

    const tools = loadToolManifest(repoRootDir);
    assert.ok(Array.isArray(tools), 'toolManifest.json must be an array');

    const unityCommandTypes = loadUnityCommandTypes(repoRootDir);
    assert.ok(unityCommandTypes.size > 0, 'expected at least one Unity command type');

    const invalid = tools
      .map(t => t?.name)
      .filter(Boolean)
      .filter(name => !unityCommandTypes.has(name) && !isAllowedNonUnityToolName(name));

    assert.equal(
      invalid.length,
      0,
      `Found tool names not matching Unity command types: ${Array.from(new Set(invalid)).sort().join(', ')}`
    );
  });
});
