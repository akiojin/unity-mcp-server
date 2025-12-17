import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Load the tool manifest JSON used by `tools/list`.
 * Throws with path context when the file cannot be read/parsed.
 */
function loadToolManifest() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const manifestPath = path.resolve(__dirname, '../../../src/core/toolManifest.json');
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to load tool manifest: ${manifestPath}\n${error.message}`, {
      cause: error
    });
  }
}

describe('toolManifest (animator tool naming)', () => {
  it('should expose get_animator_state/get_animator_runtime_info', () => {
    const tools = loadToolManifest();
    assert.ok(Array.isArray(tools), 'toolManifest.json must be an array');

    const names = new Set(tools.map(t => t?.name).filter(Boolean));

    assert.ok(names.has('get_animator_state'), "expected manifest to include 'get_animator_state'");
    assert.ok(
      names.has('get_animator_runtime_info'),
      "expected manifest to include 'get_animator_runtime_info'"
    );
  });
});
