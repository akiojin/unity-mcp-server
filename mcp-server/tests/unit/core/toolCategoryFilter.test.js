import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createToolCategoryPolicy,
  filterToolsByCategory,
  getToolCategory
} from '../../../src/core/toolCategoryFilter.js';

describe('toolCategoryFilter', () => {
  it('categorizes known tools correctly', () => {
    assert.equal(getToolCategory('addressables_manage'), 'addressables');
    assert.equal(getToolCategory('find_ui_elements'), 'ui');
    assert.equal(getToolCategory('input_keyboard'), 'input');
    assert.equal(getToolCategory('play_game'), 'playmode');
    assert.equal(getToolCategory('build_index'), 'script');
    assert.equal(getToolCategory('capture_video_start'), 'video');
    assert.equal(getToolCategory('profiler_start'), 'profiler');
    assert.equal(getToolCategory('unknown_tool_name'), 'general');
  });

  it('normalizes include/exclude categories and warns unknown names', () => {
    const warnings = [];
    const logger = {
      warning(message) {
        warnings.push(message);
      }
    };

    const policy = createToolCategoryPolicy(
      {
        includeCategories: ['Scene', 'game-object', 'Nope'],
        excludeCategories: ['ugui', 'Nope2']
      },
      logger
    );

    assert.deepEqual(policy.includeList, ['scene', 'gameobject']);
    assert.deepEqual(policy.excludeList, ['ui']);
    assert.equal(policy.isActive, true);
    assert.equal(warnings.length, 2);
  });

  it('returns all tools when no filter is active', () => {
    const tools = [{ name: 'ping' }, { name: 'find_ui_elements' }];
    const policy = createToolCategoryPolicy({});
    const result = filterToolsByCategory(tools, policy);

    assert.deepEqual(result.tools, tools);
    assert.equal(result.publicToolNames.size, 2);
    assert.equal(result.hiddenToolNames.size, 0);
  });

  it('filters tools by include categories', () => {
    const tools = [{ name: 'ping' }, { name: 'create_scene' }, { name: 'find_ui_elements' }];
    const policy = createToolCategoryPolicy({ includeCategories: ['scene', 'system'] });
    const result = filterToolsByCategory(tools, policy);

    assert.deepEqual(
      result.tools.map(t => t.name),
      ['ping', 'create_scene']
    );
    assert.equal(result.hiddenToolNames.has('find_ui_elements'), true);
  });

  it('applies exclude categories after include categories', () => {
    const tools = [{ name: 'ping' }, { name: 'find_ui_elements' }, { name: 'click_ui_element' }];
    const policy = createToolCategoryPolicy({
      includeCategories: ['system', 'ui'],
      excludeCategories: ['ui']
    });
    const result = filterToolsByCategory(tools, policy);

    assert.deepEqual(
      result.tools.map(t => t.name),
      ['ping']
    );
    assert.equal(result.hiddenToolNames.has('find_ui_elements'), true);
    assert.equal(result.hiddenToolNames.has('click_ui_element'), true);
  });
});
