import { UnityConnection } from '../../core/unityConnection.js';
import { VideoCaptureForToolHandler } from '../../handlers/video/VideoCaptureForToolHandler.js';

async function main() {
  const unity = new UnityConnection();
  try { await unity.connect(); } catch (e) { console.error('connect failed:', e.message); process.exit(1); }
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const outputPath = `Assets/Screenshots/recordings/mcp_for_${ts}.mp4`;
    const handler = new VideoCaptureForToolHandler(unity);
    const result = await handler.execute({
        captureMode: 'game',
        width: 1280,
        height: 720,
        fps: 30,
        durationSec: 2,
        play: true,
        outputPath
    });
    if (result && result.error) {
      console.error('capture_video_for error:', result.error);
    } else {
      console.log('capture_video_for ok:', result && result.outputPath);
    }
  } catch (e) {
    console.error('recordFor error:', e.message);
  } finally {
    unity.disconnect();
  }
}

main();
