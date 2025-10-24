import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { RunTestsToolHandler } from '../../../../src/handlers/test/RunTestsToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('RunTestsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection();
    handler = new RunTestsToolHandler(mockConnection);
  });

  it('should have correct tool name and description', () => {
    assert.equal(handler.name, 'test_run');
    assert.ok(handler.description.includes('Unity NUnit tests'));
  });

  it('should run EditMode tests successfully (legacy format)', async () => {
    const mockResponse = {
      success: true,
      totalTests: 10,
      passedTests: 8,
      failedTests: 2,
      skippedTests: 0,
      inconclusiveTests: 0,
      duration: 1.5,
      failures: [
        { name: 'Test1', message: 'Expected true but was false' }
      ]
    };

    mockConnection.sendCommand = mock.fn(async () => mockResponse);

    const result = await handler.execute({ testMode: 'EditMode' });

    assert.equal(result.success, true);
    assert.equal(result.totalTests, 10);
    assert.equal(result.passedTests, 8);
    assert.equal(result.failedTests, 2);
    assert.equal(result.summary, '8/10 tests passed in 1.5s');
    assert.equal(result.failures.length, 1);
  });

  it('should handle non-blocking response (status: running)', async () => {
    const mockResponse = {
      status: 'running'
    };

    mockConnection.sendCommand = mock.fn(async () => mockResponse);

    const result = await handler.execute({ testMode: 'EditMode' });

    assert.equal(result.status, 'running');
    assert.ok(result.message.includes('get_test_status'));
  });

  it('should filter tests by class name', async () => {
    const mockResponse = {
      success: true,
      totalTests: 5,
      passedTests: 5,
      failedTests: 0,
      skippedTests: 0,
      inconclusiveTests: 0,
      duration: 0.5,
      failures: []
    };

    mockConnection.sendCommand = mock.fn(async (cmd, params) => {
      assert.equal(params.filter, 'PlayerControllerTests');
      return mockResponse;
    });

    const result = await handler.execute({
      testMode: 'EditMode',
      filter: 'PlayerControllerTests'
    });

    assert.equal(result.totalTests, 5);
    assert.equal(result.passedTests, 5);
  });

  it('should filter tests by category', async () => {
    const mockResponse = {
      success: true,
      totalTests: 3,
      passedTests: 3,
      failedTests: 0,
      skippedTests: 0,
      inconclusiveTests: 0,
      duration: 0.3,
      failures: []
    };

    mockConnection.sendCommand = mock.fn(async (cmd, params) => {
      assert.equal(params.category, 'Integration');
      return mockResponse;
    });

    const result = await handler.execute({
      testMode: 'EditMode',
      category: 'Integration'
    });

    assert.equal(result.totalTests, 3);
  });

  it('should filter tests by namespace', async () => {
    const mockResponse = {
      success: true,
      totalTests: 7,
      passedTests: 6,
      failedTests: 1,
      skippedTests: 0,
      inconclusiveTests: 0,
      duration: 1.0,
      failures: [{ name: 'Test1', message: 'Failed' }]
    };

    mockConnection.sendCommand = mock.fn(async (cmd, params) => {
      assert.equal(params.namespace, 'MyGame.Tests.Player');
      return mockResponse;
    });

    const result = await handler.execute({
      testMode: 'EditMode',
      namespace: 'MyGame.Tests.Player'
    });

    assert.equal(result.totalTests, 7);
    assert.equal(result.passedTests, 6);
  });

  it('should include detailed test results when requested', async () => {
    const mockResponse = {
      success: true,
      totalTests: 2,
      passedTests: 2,
      failedTests: 0,
      skippedTests: 0,
      inconclusiveTests: 0,
      duration: 0.2,
      failures: [],
      tests: [
        { name: 'Test1', result: 'Passed', duration: 0.1 },
        { name: 'Test2', result: 'Passed', duration: 0.1 }
      ]
    };

    mockConnection.sendCommand = mock.fn(async () => mockResponse);

    const result = await handler.execute({
      testMode: 'EditMode',
      includeDetails: true
    });

    assert.ok(result.tests);
    assert.equal(result.tests.length, 2);
  });

  it('should support export path parameter', async () => {
    const mockResponse = {
      success: true,
      totalTests: 10,
      passedTests: 10,
      failedTests: 0,
      skippedTests: 0,
      inconclusiveTests: 0,
      duration: 1.0,
      failures: []
    };

    mockConnection.sendCommand = mock.fn(async (cmd, params) => {
      assert.equal(params.exportPath, 'TestResults/results.xml');
      return mockResponse;
    });

    await handler.execute({
      testMode: 'EditMode',
      exportPath: 'TestResults/results.xml'
    });

    assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
  });

  it('should run PlayMode tests', async () => {
    const mockResponse = {
      success: true,
      totalTests: 5,
      passedTests: 4,
      failedTests: 1,
      skippedTests: 0,
      inconclusiveTests: 0,
      duration: 3.5,
      failures: [{ name: 'PlayModeTest1', message: 'Failed' }]
    };

    mockConnection.sendCommand = mock.fn(async (cmd, params) => {
      assert.equal(params.testMode, 'PlayMode');
      return mockResponse;
    });

    const result = await handler.execute({ testMode: 'PlayMode' });

    assert.equal(result.totalTests, 5);
    assert.equal(result.duration, 3.5);
  });

  it('should run All tests (both EditMode and PlayMode)', async () => {
    const mockResponse = {
      success: true,
      totalTests: 15,
      passedTests: 13,
      failedTests: 2,
      skippedTests: 0,
      inconclusiveTests: 0,
      duration: 5.0,
      failures: []
    };

    mockConnection.sendCommand = mock.fn(async (cmd, params) => {
      assert.equal(params.testMode, 'All');
      return mockResponse;
    });

    const result = await handler.execute({ testMode: 'All' });

    assert.equal(result.totalTests, 15);
  });

  it('should handle errors from Unity', async () => {
    mockConnection.sendCommand = mock.fn(async () => ({
      error: 'No tests found'
    }));

    await assert.rejects(
      () => handler.execute({ testMode: 'EditMode' }),
      /No tests found/
    );
  });

  it('should connect to Unity if not connected', async () => {
    mockConnection.isConnected = mock.fn(() => false);
    mockConnection.connect = mock.fn(async () => {});
    mockConnection.sendCommand = mock.fn(async () => ({
      success: true,
      totalTests: 1,
      passedTests: 1,
      failedTests: 0,
      skippedTests: 0,
      inconclusiveTests: 0,
      duration: 0.1,
      failures: []
    }));

    await handler.execute({ testMode: 'EditMode' });

    assert.equal(mockConnection.connect.mock.calls.length, 1);
  });

  it('should provide usage examples', () => {
    const examples = handler.getExamples();

    assert.ok(examples.runAllEditModeTests);
    assert.ok(examples.runSpecificClass);
    assert.ok(examples.runCategoryTests);
    assert.ok(examples.runWithDetails);
    assert.ok(examples.runAndExport);
    assert.ok(examples.runPlayModeTests);
    assert.ok(examples.runAllTests);
  });
});
