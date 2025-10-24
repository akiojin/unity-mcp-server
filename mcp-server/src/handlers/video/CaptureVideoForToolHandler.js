/**
 * Handler for recording video for a fixed duration (auto-stop).
 * Orchestrates start→wait→stop via Unity MCP commands.
 */
import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class CaptureVideoForToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'video_capture_for',
      'Record video for a fixed duration (auto-stop). Optionally enters Play Mode first.',
      {
        type: 'object',
        properties: {
          captureMode: { type: 'string', enum: ['game'], description: 'Capture source. Currently only "game" supported.' },
          width: { type: 'number', description: 'Output width (0 = default 1280)' },
          height: { type: 'number', description: 'Output height (0 = default 720)' },
          fps: { type: 'number', description: 'Frames per second (default 30)' },
          durationSec: { type: 'number', description: 'Duration to record in seconds' },
          play: { type: 'boolean', description: 'Enter Play Mode before recording (default true if not already playing)' }
        },
        required: ['durationSec']
      }
    );
    this.unityConnection = unityConnection;
  }

  /** @override */
  async execute(params) {
    const startTime = Date.now();
    let enteredPlay = false;
    try {
      // Optionally enter Play Mode (default true if not already playing)
      let needPlay = !!params.play;
      if (params.play === undefined) {
        try {
          const s0 = await this.unityConnection.sendCommand('playmode_get_state', {});
          needPlay = !(s0 && s0.isPlaying);
        } catch { needPlay = true; }
      }
      if (needPlay) {
        await this.unityConnection.sendCommand('playmode_play', {});
        for (let i = 0; i < 60; i++) {
          const s = await this.unityConnection.sendCommand('get_editor_state', {});
          if (s && s.isPlaying) { enteredPlay = true; break; }
          await sleep(250);
        }
      }

      // Start with auto-stop
      const { WORKSPACE_ROOT } = await import('../../core/config.js');
      const startResp = await this.unityConnection.sendCommand('video_capture_start', {
        captureMode: params.captureMode || 'game',
        width: params.width ?? 1280,
        height: params.height ?? 720,
        fps: params.fps ?? 30,
        maxDurationSec: params.durationSec,
        workspaceRoot: WORKSPACE_ROOT
      });
      if (startResp && startResp.error) {
        return { error: startResp.error, code: startResp.code || 'UNITY_ERROR' };
      }

      // Wait until stopped (status reports isRecording=false)
      const deadline = Date.now() + Math.max(0, Math.floor((params.durationSec || 0) * 1000)) + 1500; // small buffer
      let lastStatus = null;
      while (Date.now() < deadline) {
        lastStatus = await this.unityConnection.sendCommand('video_capture_status', {});
        if (lastStatus && lastStatus.isRecording === false) break;
        await sleep(250);
      }

      // Safety stop if still recording after deadline
      if (lastStatus && lastStatus.isRecording) {
        await this.unityConnection.sendCommand('video_capture_stop', {});
      }

      // Final stop result
      const stopResp = await this.unityConnection.sendCommand('capture_video_stop', {});
      const elapsedMs = Date.now() - startTime;
      return {
        ...stopResp,
        requestedDurationSec: params.durationSec,
        elapsedMs,
        message: 'Video recorded for requested duration and stopped'
      };
    } catch (e) {
      return { error: e.message, code: 'CLIENT_ERROR' };
    } finally {
      // If we entered play, attempt to leave play (best-effort)
      try { if (enteredPlay) await this.unityConnection.sendCommand('playmode_stop', {}); } catch {}
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
