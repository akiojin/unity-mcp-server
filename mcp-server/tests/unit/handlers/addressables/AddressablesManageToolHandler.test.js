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
  });
});
