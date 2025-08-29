import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class IndexStatusToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'index_status',
            'Get the status of the code index',
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

        const result = await this.unityConnection.sendCommand('index_status', {});

        return result;
    }
}