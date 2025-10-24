/**
 * Handler for starting video capture in Unity Editor (via MCP)
 */
import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class CaptureVideoStartToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'video_capture_start',
      'Start video recording (Game view). Requires com.unity.recorder.',
      {
        type: 'object',
        properties: {
          captureMode: { type: 'string', enum: ['game'], description: 'Capture source. Currently only "game" supported.' },
          width: { type: 'number', description: 'Output width (0 = auto/default)' },
          height: { type: 'number', description: 'Output height (0 = auto/default)' },
          fps: { type: 'number', description: 'Frames per second (e.g., 30)' },
          maxDurationSec: { type: 'number', description: 'Auto stop after N seconds (0 = unlimited)' }
        }
      }
    );
    this.unityConnection = unityConnection;
  }

  /** @override */
  async execute(params, context) {
    const { WORKSPACE_ROOT } = await import('../../core/config.js');
    const { outputPath, ...rest } = params || {};
    const response = await this.unityConnection.sendCommand('capture_video_start', { ...rest, workspaceRoot: WORKSPACE_ROOT });
    if (response.error) {
      return { error: response.error, code: response.code || 'UNITY_ERROR' };
    }
    return {
      ...response,
      message: response.message || 'Video recording started'
    };
  }
}
