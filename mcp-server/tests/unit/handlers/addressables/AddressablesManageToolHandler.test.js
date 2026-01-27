import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import AddressablesManageToolHandler from '../../../../src/handlers/addressables/AddressablesManageToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AddressablesManageToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: {} });
    handler = new AddressablesManageToolHandler(mockConnection);
  });

  it('should initialize with correct name', () => {
    assert.equal(handler.name, 'addressables_manage');
  });

  it('should send command with addressables_manage', async () => {
    await handler.execute({ action: 'list_groups' });
    const [command, params] = mockConnection.sendCommand.mock.calls[0].arguments;
    assert.equal(command, 'addressables_manage');
    assert.equal(params.action, 'list_groups');
    assert.ok(params.workspaceRoot);
  });

  it('rejects invalid action', () => {
    assert.throws(() => handler.validate({ action: 'invalid_action' }), /Invalid action/);
  });

  it('requires assetPath and address for add_entry', () => {
    assert.throws(() => handler.validate({ action: 'add_entry' }), /assetPath is required/);
    assert.throws(
      () => handler.validate({ action: 'add_entry', assetPath: 'Assets/Foo.prefab' }),
      /address is required/
    );
  });

  it('throws when Unity returns an error payload', async () => {
    mockConnection.sendCommand = async () => ({ error: 'boom' });
    await assert.rejects(() => handler.execute({ action: 'list_groups' }), /boom/);
  });
});
