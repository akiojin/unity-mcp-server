import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { WORKSPACE_ROOT } from '../../../src/core/config.js';
import { resolveDbPath } from '../../../src/core/indexBuildWorkerPool.js';

describe('IndexBuildWorkerPool dbPath resolution', () => {
  it('should use provided dbPath as-is', () => {
    const provided = '/tmp/provided-code-index.db';
    const resolved = resolveDbPath({
      projectRoot: '/mock/project',
      dbPath: provided
    });

    assert.equal(resolved, provided);
  });

  it('should resolve default dbPath under workspace root when missing', () => {
    const resolved = resolveDbPath({
      projectRoot: '/mock/project'
    });
    const expected = path.join(WORKSPACE_ROOT, '.unity', 'cache', 'code-index', 'code-index.db');

    assert.equal(resolved, expected);
  });
});

