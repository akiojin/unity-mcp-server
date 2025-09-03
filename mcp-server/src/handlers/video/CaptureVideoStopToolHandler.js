/**
 * Handler for stopping video capture in Unity Editor (via MCP)
 */
import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class CaptureVideoStopToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'capture_video_stop',
      'Stop current video recording and finalize the file.',
      {
        type: 'object',
        properties: {
          recordingId: { type: 'string', description: 'Optional. Stop a specific recording session. Defaults to the latest.' }
        }
      }
    );
    this.unityConnection = unityConnection;
  }

  /** @override */
  async execute(params, context) {
    const response = await this.unityConnection.sendCommand('capture_video_stop', params || {});
    if (response.error) {
      return { error: response.error, code: response.code || 'UNITY_ERROR' };
    }
    return {
      ...response,
      message: response.message || 'Video recording stopped'
    };
  }
}
