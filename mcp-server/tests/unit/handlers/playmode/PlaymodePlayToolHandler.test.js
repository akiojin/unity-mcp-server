import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PlaymodePlayToolHandler } from '../../../../src/handlers/playmode/PlaymodePlayToolHandler.js';

describe('PlaymodePlayToolHandler', () => {
  const createHandler = sendCommand =>
    new PlaymodePlayToolHandler({
      isConnected: () => true,
      connect: mock.fn(async () => {}),
      sendCommand
    });

  it('should poll get_editor_state until isPlaying becomes true', async () => {
    let pollCount = 0;
    const sendCommand = mock.fn(async type => {
      if (type === 'play_game') {
        return { status: 'success', message: 'scheduled' };
      }
      if (type === 'get_editor_state') {
        pollCount++;
        return {
          status: 'success',
          state: { isPlaying: pollCount >= 2 }
        };
      }
      throw new Error(`Unexpected command: ${type}`);
    });

    const handler = createHandler(sendCommand);
    const result = await handler.execute({ pollIntervalMs: 0 });

    assert.equal(result.status, 'success');
    assert.equal(result.state.isPlaying, true);
    assert.ok(pollCount >= 2);
    assert.equal(sendCommand.mock.calls[0].arguments[0], 'play_game');
    assert.ok(sendCommand.mock.calls.some(call => call.arguments[0] === 'get_editor_state'));
  });

  it('should accept editor state delivered via _editorState', async () => {
    let returnedPlaying = false;
    const sendCommand = mock.fn(async type => {
      if (type === 'play_game') {
        return { status: 'success', message: 'entered' };
      }
      if (type === 'get_editor_state') {
        if (!returnedPlaying) {
          returnedPlaying = true;
          return { status: 'success', state: { isPlaying: false } };
        }
        return {
          status: 'success',
          _editorState: { isPlaying: true }
        };
      }
      throw new Error(`Unexpected command: ${type}`);
    });

    const handler = createHandler(sendCommand);
    const result = await handler.execute({ pollIntervalMs: 0 });

    assert.equal(result.status, 'success');
    assert.equal(result.state.isPlaying, true);
    const getStateCalls = sendCommand.mock.calls.filter(
      call => call.arguments[0] === 'get_editor_state'
    ).length;
    assert.ok(getStateCalls >= 2);
  });
});
