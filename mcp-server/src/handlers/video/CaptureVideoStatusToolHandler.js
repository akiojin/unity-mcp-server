/**
 * Handler for querying video capture status in Unity Editor (via MCP)
 */
import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class CaptureVideoStatusToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'capture_video_status',
      'Get current video recording status.',
      {
        type: 'object',
        properties: {}
      }
    );
    this.unityConnection = unityConnection;
  }

  /** @override */
  async execute(params, context) {
    const response = await this.unityConnection.sendCommand('capture_video_status', params || {});
    if (response.error) {
      return { error: response.error, code: response.code || 'UNITY_ERROR' };
    }
    return {
      ...response,
      message: response.message || 'Video recording status retrieved'
    };
  }
}
