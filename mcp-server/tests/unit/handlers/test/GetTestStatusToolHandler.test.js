import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { GetTestStatusToolHandler } from '../../../../src/handlers/test/GetTestStatusToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetTestStatusToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection();
    handler = new GetTestStatusToolHandler(mockConnection);
  });

  it('should have correct tool name and description', () => {
    assert.equal(handler.name, 'test_get_status');
    assert.ok(handler.description.includes('test execution status'));
  });

  it('should return idle status when no tests are running', async () => {
    const mockResponse = {
      status: 'idle',
      message: 'No tests currently running'
    };

    mockConnection.sendCommand = mock.fn(async () => mockResponse);

    const result = await handler.execute({});

    assert.equal(result.status, 'idle');
    assert.ok(result.message);
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
    assert.ok(result.message);
    assert.ok(result.progress);
    assert.equal(result.progress.completed, 3);
    assert.equal(result.progress.total, 10);
  });

  it('should return completed status with test results', async () => {
    const mockResponse = {
      status: 'completed',
      success: true,
      totalTests: 10,
      passedTests: 8,
      failedTests: 2,
      skippedTests: 0,
      inconclusiveTests: 0,
      failures: [
        { name: 'Test1', message: 'Expected true' },
        { name: 'Test2', message: 'NullReferenceException' }
      ],
      tests: [
        { name: 'Test1', result: 'Failed', duration: 0.1 },
        { name: 'Test2', result: 'Failed', duration: 0.2 },
        { name: 'Test3', result: 'Passed', duration: 0.05 }
      ]
    };

    mockConnection.sendCommand = mock.fn(async () => mockResponse);

    const result = await handler.execute({});

    assert.equal(result.status, 'completed');
    assert.equal(result.success, true);
    assert.equal(result.totalTests, 10);
    assert.equal(result.passedTests, 8);
    assert.equal(result.failedTests, 2);
    assert.equal(result.summary, '8/10 tests passed');
    assert.equal(result.failures.length, 2);
    assert.equal(result.tests.length, 3);
  });

  it('should return completed status when all tests pass', async () => {
    const mockResponse = {
      status: 'completed',
      success: true,
      totalTests: 5,
      passedTests: 5,
      failedTests: 0,
      skippedTests: 0,
      inconclusiveTests: 0,
      failures: [],
      tests: []
    };

    mockConnection.sendCommand = mock.fn(async () => mockResponse);

    const result = await handler.execute({});

    assert.equal(result.status, 'completed');
    assert.equal(result.success, true);
    assert.equal(result.totalTests, 5);
    assert.equal(result.passedTests, 5);
    assert.equal(result.failedTests, 0);
    assert.equal(result.summary, '5/5 tests passed');
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

    await assert.rejects(
      () => handler.execute({}),
      /Unity Editor not responding/
    );
  });

  it('should connect to Unity if not connected', async () => {
    mockConnection.isConnected = mock.fn(() => false);
    mockConnection.connect = mock.fn(async () => {});
    mockConnection.sendCommand = mock.fn(async () => ({
      status: 'idle',
      message: 'No tests running'
    }));

    await handler.execute({});

    assert.equal(mockConnection.connect.mock.calls.length, 1);
  });

  it('should handle completed status with no failures array', async () => {
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

    mockConnection.sendCommand = mock.fn(async () => mockResponse);

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
    assert.equal(examples.checkStatus.description, 'Check current test execution status');
  });
});
