import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { SystemGetServerInfoToolHandler } from '../../../../src/handlers/system/SystemGetServerInfoToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('SystemGetServerInfoToolHandler', () => {
  let handler;

  beforeEach(() => {
    const mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new SystemGetServerInfoToolHandler(mockConnection);
  });

  it('should return identifying info', async () => {
    const result = await handler.execute({});
    assert.equal(result.success, true);
    assert.equal(typeof result.pid, 'number');
    assert.ok(result.projectRoot);
    assert.ok(result.workspaceRoot);
    assert.equal(result.server?.name != null, true);
    assert.equal(result.server?.version != null, true);
  });
});
