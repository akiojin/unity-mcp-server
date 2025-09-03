import { UnityConnection } from '../../core/unityConnection.js';
import { config } from '../../core/config.js';

async function main() {
  const unity = new UnityConnection();
  try {
    await unity.connect();
  } catch (e) {
    console.error('[recordPlayMode] Failed to connect to Unity:', e.message);
    process.exit(1);
  }

  try {
    // Enter Play Mode
    await unity.sendCommand('play_game', {});
    // Domain reload causes disconnect. Reconnect and wait for play.
    for (let i = 0; i < 60; i++) {
      if (!unity.isConnected()) {
        try { await unity.connect(); } catch {}
      }
      try {
        const s = await unity.sendCommand('get_editor_state', {});
        if (s && s.isPlaying) break;
      } catch {}
      await new Promise(r => setTimeout(r, 500));
    }

    // Start recording
    const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const outputPath = `Assets/Screenshots/recordings/mcp_play_${ts}.mp4`;
    const start = await unity.sendCommand('capture_video_start', {
      outputPath,
      captureMode: 'game',
      width: 1280,
      height: 720,
      fps: 30,
      maxDurationSec: 3
    });
    if (start && start.error) {
      console.error('[recordPlayMode] start error:', start.error);
    }

    // Poll status a few times
    for (let i = 0; i < 16; i++) {
      const st = await unity.sendCommand('capture_video_status', {});
      // console.log('[recordPlayMode] status', st);
      await new Promise(r => setTimeout(r, 250));
    }

    // Ensure stopped
    await unity.sendCommand('capture_video_stop', {});

  } catch (e) {
    console.error('[recordPlayMode] error:', e.message);
  } finally {
    try {
      if (!unity.isConnected()) { await unity.connect(); }
      await unity.sendCommand('stop_game', {});
    } catch {}
    unity.disconnect();
  }
}

main();
