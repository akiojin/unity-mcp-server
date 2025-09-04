import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class GetRoslynCliPathToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'diagnose_roslyn_cli_path',
      'Diagnose which roslyn-cli binary path the server will use. Returns the resolved path or an error if unavailable.',
      {
        type: 'object',
        properties: {},
        required: []
      }
    );
    this.unityConnection = unityConnection;
  }

  async execute() {
    try {
      const { RoslynCliUtils } = await import('./RoslynCliUtils.js');
      const utils = new RoslynCliUtils(this.unityConnection);
      const path = await utils.getCliPath();
      return { success: true, path };
    } catch (e) {
      return { success: false, error: 'roslyn_cli_unavailable', message: e.message };
    }
  }
}

