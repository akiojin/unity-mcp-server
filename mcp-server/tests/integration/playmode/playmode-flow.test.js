import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PlaymodePlayToolHandler } from '../../../src/handlers/playmode/PlaymodePlayToolHandler.js';
import { PlaymodeStopToolHandler } from '../../../src/handlers/playmode/PlaymodeStopToolHandler.js';

class FakeUnityConnection {
  constructor() {
    this.connected = true;
    this.isPlaying = false;
    this.playCountdown = 0;
    this.stopCountdown = 0;
    this.sendLog = [];
  }

  isConnected() {
    return this.connected;
  }

  async connect() {
    this.connected = true;
  }

  async sendCommand(type) {
    this.sendLog.push(type);
    switch (type) {
      case 'play_game':
        this.playCountdown = 1; // require one poll cycle before playing
        return { status: 'success', message: 'Play requested' };
      case 'stop_game':
        this.stopCountdown = 1; // require one poll cycle before stopping
        return { status: 'success', message: 'Stop requested' };
      case 'get_editor_state':
        if (this.playCountdown > 0) {
          this.playCountdown--;
          if (this.playCountdown === 0) {
            this.isPlaying = true;
          }
        }
        if (this.stopCountdown > 0) {
          this.stopCountdown--;
          if (this.stopCountdown === 0) {
            this.isPlaying = false;
          }
        }
        return {
          status: 'success',
          state: {
            isPlaying: this.isPlaying,
            isPaused: false,
            isCompiling: false,
            timeSinceStartup: 0
          }
        };
      default:
        throw new Error(`Unexpected command ${type}`);
    }
  }
}

describe('Play Mode end-to-end flow (handlers)', () => {
  it('should enter and exit Play Mode using the tool handlers', async () => {
    const unityConnection = new FakeUnityConnection();
    const playHandler = new PlaymodePlayToolHandler(unityConnection);
    const stopHandler = new PlaymodeStopToolHandler(unityConnection);

    const playResult = await playHandler.execute({ pollIntervalMs: 0, maxWaitMs: 2000 });
    assert.equal(playResult.status, 'success');
    assert.equal(playResult.state.isPlaying, true);
    assert.ok(unityConnection.sendLog.includes('play_game'));

    const stopResult = await stopHandler.execute({ pollIntervalMs: 0, maxWaitMs: 2000 });
    assert.equal(stopResult.status, 'success');
    assert.equal(stopResult.state.isPlaying, false);
    assert.ok(unityConnection.sendLog.includes('stop_game'));
  });
});
