import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PlaymodeStopToolHandler } from '../../../../src/handlers/playmode/PlaymodeStopToolHandler.js';

describe('PlaymodeStopToolHandler', () => {
  const createHandler = sendCommand =>
    new PlaymodeStopToolHandler({
      isConnected: () => true,
      connect: mock.fn(async () => {}),
      sendCommand
    });

  it('should poll get_editor_state until play mode stops', async () => {
    let pollCount = 0;
    const sendCommand = mock.fn(async type => {
      if (type === 'stop_game') {
        return { status: 'success', message: 'Stopping' };
      }
      if (type === 'get_editor_state') {
        pollCount++;
        return {
          status: 'success',
          state: { isPlaying: pollCount < 2 }
        };
      }
      throw new Error(`Unexpected command: ${type}`);
    });

    const handler = createHandler(sendCommand);
    const result = await handler.execute({ pollIntervalMs: 0 });

    assert.equal(result.status, 'success');
    assert.equal(result.state.isPlaying, false);
    assert.equal(result.message, 'Stopping');
    assert.ok(sendCommand.mock.calls.some(call => call.arguments[0] === 'stop_game'));
    assert.ok(sendCommand.mock.calls.some(call => call.arguments[0] === 'get_editor_state'));
  });

  it('should accept editor state delivered via _editorState', async () => {
    let first = true;
    const sendCommand = mock.fn(async type => {
      if (type === 'stop_game') {
        return { status: 'success', message: 'Done' };
      }
      if (type === 'get_editor_state') {
        if (first) {
          first = false;
          return { status: 'success', state: { isPlaying: true } };
        }
        return { status: 'success', _editorState: { isPlaying: false } };
      }
      throw new Error(`Unexpected command: ${type}`);
    });

    const handler = createHandler(sendCommand);
    const result = await handler.execute({ pollIntervalMs: 0 });

    assert.equal(result.status, 'success');
    assert.equal(result.state.isPlaying, false);
    assert.equal(result.message, 'Done');
  });
});
