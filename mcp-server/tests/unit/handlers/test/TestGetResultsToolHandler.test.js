import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { TestGetResultsToolHandler } from '../../../../src/handlers/test/TestGetResultsToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('TestGetResultsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection();
    handler = new TestGetResultsToolHandler(mockConnection);
  });

  it('should have correct tool metadata', () => {
    assert.equal(handler.name, 'test_get_results');
    assert.ok(handler.description.includes('test results'));
  });

  it('should request latest test results from Unity', async () => {
    const mockResponse = {
      status: 'available',
      path: '/tmp/TestResults.json',
      summary: {
        totalTests: 5,
        passed: 5
      },
      fileContent: '{"totalTests":5}'
    };

    mockConnection.sendCommand = mock.fn(async () => mockResponse);

    const result = await handler.execute({ includeFileContent: true });

    assert.equal(result.status, 'available');
    assert.equal(result.summary.totalTests, 5);
    assert.ok(result.fileContent.includes('totalTests'));
    assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'get_test_results');
  });

  it('should throw when Unity returns an error', async () => {
    mockConnection.sendCommand = mock.fn(async () => ({ error: 'no results' }));

    await assert.rejects(() => handler.execute({}), /no results/);
  });

  it('should connect to Unity when needed', async () => {
    mockConnection.isConnected = mock.fn(() => false);
    mockConnection.connect = mock.fn(async () => {});
    mockConnection.sendCommand = mock.fn(async () => ({ status: 'missing' }));

    await handler.execute({ includeFileContent: false });

    assert.equal(mockConnection.connect.mock.calls.length, 1);
  });
});
