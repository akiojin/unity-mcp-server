import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeSceneContentsToolDefinition,
  analyzeSceneContentsHandler
} from '../../../../src/tools/analysis/analyzeSceneContents.js';

describe('AnalyzeSceneContentsTool', () => {
  let mockUnityConnection;
  let sendCommandSpy;

  beforeEach(() => {
    sendCommandSpy = mock.fn(() =>
      Promise.resolve({
        summary: 'Scene contains 156 GameObjects with 89 renderers and 4 lights'
      })
    );

    mockUnityConnection = {
      sendCommand: sendCommandSpy,
      isConnected: () => true
    };
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should have correct tool definition', () => {
    assert.equal(analyzeSceneContentsToolDefinition.name, 'analyze_scene_contents');
    assert.equal(
      analyzeSceneContentsToolDefinition.description,
      'Analyze current scene: object counts, types, prefabs, and memory stats.'
    );
  });

  it('should have correct input schema', () => {
    const schema = analyzeSceneContentsToolDefinition.inputSchema;
    assert.equal(schema.type, 'object');
    assert.ok(schema.properties.includeInactive);
    assert.ok(schema.properties.groupByType);
    assert.ok(schema.properties.includePrefabInfo);
    assert.ok(schema.properties.includeMemoryInfo);
    assert.deepEqual(schema.required, []);
  });

  it('should analyze scene with default parameters', async () => {
    const args = {};

    const result = await analyzeSceneContentsHandler(mockUnityConnection, args);

    assert.equal(sendCommandSpy.mock.calls.length, 1);
    assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'analyze_scene_contents');
    assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);

    assert.equal(result.isError, false);
    assert.equal(
      result.content[0].text,
      'Scene contains 156 GameObjects with 89 renderers and 4 lights'
    );
  });

  it('should analyze scene with all options enabled', async () => {
    const args = {
      includeInactive: true,
      groupByType: true,
      includePrefabInfo: true,
      includeMemoryInfo: true
    };

    const result = await analyzeSceneContentsHandler(mockUnityConnection, args);

    assert.equal(result.isError, false);
    assert.equal(sendCommandSpy.mock.calls[0].arguments[1].includeInactive, true);
    assert.equal(sendCommandSpy.mock.calls[0].arguments[1].groupByType, true);
    assert.equal(sendCommandSpy.mock.calls[0].arguments[1].includePrefabInfo, true);
    assert.equal(sendCommandSpy.mock.calls[0].arguments[1].includeMemoryInfo, true);
  });

  it('should handle scene with no objects', async () => {
    sendCommandSpy.mock.mockImplementation(() => Promise.resolve({ summary: 'Scene is empty' }));

    const result = await analyzeSceneContentsHandler(mockUnityConnection, {});

    assert.equal(result.isError, false);
    assert.ok(result.content[0].text.includes('Scene is empty'));
  });

  it('should handle connection not available', async () => {
    mockUnityConnection.isConnected = () => false;

    const result = await analyzeSceneContentsHandler(mockUnityConnection, {});

    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('Unity connection not available'));
  });

  it('should handle Unity error response', async () => {
    sendCommandSpy.mock.mockImplementation(() =>
      Promise.resolve({ error: 'Failed to analyze scene: Scene not loaded' })
    );

    const result = await analyzeSceneContentsHandler(mockUnityConnection, {});

    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('Failed to analyze scene'));
  });

  it('should handle command timeout', async () => {
    sendCommandSpy.mock.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Command timeout')), 100))
    );

    const result = await analyzeSceneContentsHandler(mockUnityConnection, {});

    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('Command timeout'));
  });

  it('should include memory info when requested', async () => {
    sendCommandSpy.mock.mockImplementation(() =>
      Promise.resolve({ summary: 'Scene analysis complete with memory info' })
    );

    const result = await analyzeSceneContentsHandler(mockUnityConnection, {
      includeMemoryInfo: true
    });

    assert.equal(result.isError, false);
    assert.ok(result.content[0].text.includes('memory info'));
  });
});
