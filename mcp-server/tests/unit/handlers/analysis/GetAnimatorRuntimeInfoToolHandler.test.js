import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GetAnimatorRuntimeInfoToolHandler } from '../../../../src/handlers/analysis/GetAnimatorStateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetAnimatorRuntimeInfoToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        summary: 'Animator runtime info retrieved',
        runtimeAnimatorController: 'PlayerAnimator',
        updateMode: 'Normal',
        cullingMode: 'AlwaysAnimate',
        speed: 1.0,
        playbackTime: 0.123
      }
    });
    handler = new GetAnimatorRuntimeInfoToolHandler(mockConnection);
  });

  it('should initialize with correct name', () => {
    assert.equal(handler.name, 'analysis_animator_runtime_info_get');
  });

  it('should call get_animator_runtime_info in Unity', async () => {
    const result = await handler.execute({
      gameObjectName: 'Player'
    });

    assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
    assert.equal(
      mockConnection.sendCommand.mock.calls[0].arguments[0],
      'get_animator_runtime_info'
    );

    assert.equal(result.isError, false);
    assert.ok(result.content[0].text.includes('General Info'));
  });
});
