import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import AddressablesAnalyzeToolHandler from '../../../../src/handlers/addressables/AddressablesAnalyzeToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AddressablesAnalyzeToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: {} });
    handler = new AddressablesAnalyzeToolHandler(mockConnection);
  });

  it('should initialize with correct name', () => {
    assert.equal(handler.name, 'addressables_analyze');
  });

  it('should send command with addressables_analyze', async () => {
    await handler.execute({ action: 'analyze_duplicates' });
    const [command, params, timeout] = mockConnection.sendCommand.mock.calls[0].arguments;
    assert.equal(command, 'addressables_analyze');
    assert.equal(params.action, 'analyze_duplicates');
    assert.ok(params.workspaceRoot);
    assert.equal(timeout, 300000);
  });
});
