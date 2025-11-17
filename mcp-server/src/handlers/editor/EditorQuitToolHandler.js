import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler to quit Unity Editor safely.
 */
export class EditorQuitToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('editor_quit', 'Quit Unity Editor', {
      type: 'object',
      properties: {}
    });

    this.unityConnection = unityConnection;
  }

  async execute() {
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }
    const response = await this.unityConnection.sendCommand('quit_editor', {});
    if (response.error) {
      throw new Error(response.error);
    }
    return response;
  }
}
