import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptIndexStatusToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_index_status',
            'Report code index status and readiness for symbol/search operations.',
            {
                type: 'object',
                properties: {},
                required: []
            }
        );
        this.unityConnection = unityConnection;
    }

    async execute(params) {
        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('script_index_status', {});

        return result;
    }
}
