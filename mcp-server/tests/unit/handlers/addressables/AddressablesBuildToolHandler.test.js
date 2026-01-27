import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import AddressablesBuildToolHandler from '../../../../src/handlers/addressables/AddressablesBuildToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AddressablesBuildToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: {} });
    handler = new AddressablesBuildToolHandler(mockConnection);
  });

  it('should initialize with correct name', () => {
    assert.equal(handler.name, 'addressables_build');
  });

  it('should send command with addressables_build', async () => {
    await handler.execute({ action: 'clean_build' });
    const [command, params, timeout] = mockConnection.sendCommand.mock.calls[0].arguments;
    assert.equal(command, 'addressables_build');
    assert.equal(params.action, 'clean_build');
    assert.ok(params.workspaceRoot);
    assert.equal(timeout, 300000);
  });

  it('rejects invalid action', () => {
    assert.throws(() => handler.validate({ action: 'invalid_action' }), /Invalid action/);
  });

  it('throws when Unity returns an error payload', async () => {
    mockConnection.sendCommand = async () => ({ error: 'boom' });
    await assert.rejects(() => handler.execute({ action: 'build' }), /boom/);
  });
});
