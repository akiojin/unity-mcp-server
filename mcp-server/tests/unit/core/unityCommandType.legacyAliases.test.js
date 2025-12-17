import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUnityCommandType } from '../../../src/core/unityCommandType.js';

describe('normalizeUnityCommandType (legacy tool aliases)', () => {
  it('should map legacy MCP tool names to Unity command types', () => {
    const cases = [
      ['analysis_animator_state_get', 'get_animator_state'],
      ['analysis_animator_runtime_info_get', 'get_animator_runtime_info'],
      ['system_ping', 'ping'],
      ['gameobject_create', 'create_gameobject'],
      ['scene_info_get', 'get_scene_info'],
      ['analysis_scene_contents_analyze', 'analyze_scene_contents'],
      ['ui_find_elements', 'find_ui_elements'],
      ['video_capture_start', 'capture_video_start'],
      ['component_add', 'add_component'],
      ['compilation_get_state', 'get_compilation_state'],
      ['test_run', 'run_tests']
    ];

    for (const [legacyName, unityType] of cases) {
      assert.equal(normalizeUnityCommandType(legacyName), unityType);
    }
  });

  it('should pass through non-strings and unknown values', () => {
    assert.equal(normalizeUnityCommandType(undefined), undefined);
    assert.equal(normalizeUnityCommandType(null), null);
    assert.equal(normalizeUnityCommandType(''), '');
    assert.equal(normalizeUnityCommandType('some_unknown_tool'), 'some_unknown_tool');
  });
});
