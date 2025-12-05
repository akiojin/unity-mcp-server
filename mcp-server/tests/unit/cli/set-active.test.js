import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InstanceRegistry } from '../../../src/core/instanceRegistry.js';
import { setActive } from '../../../src/cli/commands/setActive.js';

describe('set-active CLI command', () => {
  it('errors when id not found', async () => {
    const registry = new InstanceRegistry([]);
    await assert.rejects(() => setActive({ id: 'localhost:6400', registry }), /not found/);
  });
});
