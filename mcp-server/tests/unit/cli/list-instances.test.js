import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listInstances } from '../../../src/cli/commands/listInstances.js';

describe('list-instances CLI command', () => {
  it('handles empty ports', async () => {
    const list = await listInstances({ ports: [], host: 'localhost' });
    assert.deepEqual(list, []);
  });
});
