import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { TestGetStatusToolHandler } from '../../../../src/handlers/test/TestGetStatusToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';
import * as testResultsCache from '../../../../src/utils/testResultsCache.js';

describe('TestGetStatusToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection();
    handler = new TestGetStatusToolHandler(mockConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should have correct tool name and description', () => {
    assert.equal(handler.name, 'test_get_status');
    assert.ok(handler.description.includes('test execution status'));
  });

  it('should return idle status when no tests are running and no cache exists', async () => {
    const mockResponse = {
      status: 'idle',
      message: 'No tests currently running'
    };

    mockConnection.sendCommand = mock.fn(async () => mockResponse);
    mock.method(testResultsCache, 'loadCachedTestResults', async () => null);

    const result = await handler.execute({});

    assert.equal(result.status, 'idle');
    assert.ok(result.message);
  });

  it('should return cached results when Unity reports idle but cache exists', async () => {
    const cachedResult = {
      status: 'completed',
      success: true,
      totalTests: 2,
      passedTests: 2,
      failedTests: 0,
      skippedTests: 0,
      inconclusiveTests: 0,
      summary: '2/2 tests passed',
      failures: [],
      tests: []
    };

    mockConnection.sendCommand = mock.fn(async () => ({
      status: 'idle',
      message: 'No tests running'
    }));

    mock.method(testResultsCache, 'loadCachedTestResults', async () => cachedResult);

    const result = await handler.execute({});

    assert.deepEqual(result, cachedResult);
  });

  it('should return running status during test execution', async () => {
    const mockResponse = {
      status: 'running',
      message: 'Running 10 tests...',
      progress: {
        completed: 3,
        total: 10
      }
    };

    mockConnection.sendCommand = mock.fn(async () => mockResponse);

    const result = await handler.execute({});

    assert.equal(result.status, 'running');
    assert.ok(result.progress);
    assert.equal(result.progress.completed, 3);
  });

  it('should persist and return cached results when tests complete', async () => {
    const mockResponse = {
      status: 'completed',
      success: true,
      totalTests: 10,
      passedTests: 8,
      failedTests: 2,
      skippedTests: 0,
      inconclusiveTests: 0,
      failures: [{ testName: 'Foo', message: 'Failed' }],
      tests: []
    };

    const cachedResult = {
      ...mockResponse,
      summary: '8/10 tests passed'
    };

    mockConnection.sendCommand = mock.fn(async () => mockResponse);
    const persistMock = mock.method(
      testResultsCache,
      'persistTestResults',
      async () => '/tmp/TestResults.json'
    );
    const loadMock = mock.method(
      testResultsCache,
      'loadCachedTestResults',
      async () => cachedResult
    );

    const result = await handler.execute({});

    assert.deepEqual(result, cachedResult);
    assert.equal(persistMock.mock.calls.length, 1);
    assert.equal(loadMock.mock.calls.length, 1);
    assert.equal(loadMock.mock.calls[0].arguments[0], '/tmp/TestResults.json');
  });

  it('should include latest exported results when requested', async () => {
    const mockResponse = {
      status: 'completed',
      success: true,
      totalTests: 1,
      passedTests: 1,
      failedTests: 0,
      skippedTests: 0,
      inconclusiveTests: 0,
      failures: [],
      tests: [],
      latestResult: {
        status: 'available',
        path: '/tmp/TestResults.json',
        summary: { totalTests: 1, passed: 1 },
        fileContent: '{"totalTests":1}'
      }
    };

    mockConnection.sendCommand = mock.fn(async (_cmd, params) => {
      assert.equal(params.includeTestResults, true);
      assert.equal(params.includeFileContent, true);
      return mockResponse;
    });

    const result = await handler.execute({ includeTestResults: true, includeFileContent: true });

    assert.ok(result.latestResult);
    assert.equal(result.latestResult.status, 'available');
    assert.equal(result.latestResult.summary.totalTests, 1);
    assert.ok(result.latestResult.fileContent.includes('totalTests'));
  });

  it('should handle error status', async () => {
    const mockResponse = {
      status: 'error',
      message: 'Test execution failed to start',
      errorDetails: 'Test assembly not found'
    };

    mockConnection.sendCommand = mock.fn(async () => mockResponse);

    const result = await handler.execute({});

    assert.equal(result.status, 'error');
    assert.ok(result.message);
  });

  it('should handle errors from Unity', async () => {
    mockConnection.sendCommand = mock.fn(async () => ({
      error: 'Unity Editor not responding'
    }));

    await assert.rejects(() => handler.execute({}), /Unity Editor not responding/);
  });

  it('should connect to Unity if not connected', async () => {
    mockConnection.isConnected = mock.fn(() => false);
    mockConnection.connect = mock.fn(async () => {});
    mockConnection.sendCommand = mock.fn(async () => ({
      status: 'idle',
      message: 'No tests running'
    }));
    mock.method(testResultsCache, 'loadCachedTestResults', async () => null);

    await handler.execute({});

    assert.equal(mockConnection.connect.mock.calls.length, 1);
  });

  it('should handle completed status with no failures array via cache', async () => {
    const mockResponse = {
      status: 'completed',
      success: true,
      totalTests: 3,
      passedTests: 3,
      failedTests: 0,
      skippedTests: 0,
      inconclusiveTests: 0
      // No failures or tests array
    };

    const cachedResult = {
      ...mockResponse,
      failures: [],
      tests: []
    };

    mockConnection.sendCommand = mock.fn(async () => mockResponse);
    mock.method(testResultsCache, 'persistTestResults', async () => '/tmp/TestResults.json');
    mock.method(testResultsCache, 'loadCachedTestResults', async () => cachedResult);

    const result = await handler.execute({});

    assert.equal(result.status, 'completed');
    assert.ok(Array.isArray(result.failures));
    assert.equal(result.failures.length, 0);
    assert.ok(Array.isArray(result.tests));
    assert.equal(result.tests.length, 0);
  });

  it('should provide usage examples', () => {
    const examples = handler.getExamples();

    assert.ok(examples.checkStatus);
    assert.ok(examples.checkWithResults);
  });
});
