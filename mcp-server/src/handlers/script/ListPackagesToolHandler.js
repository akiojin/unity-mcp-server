import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptListPackagesToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_packages_list',
            'List Unity packages in the project',
            {
                type: 'object',
                properties: {
                    includeBuiltIn: {
                        type: 'boolean',
                        default: false,
                        description: 'Whether to include built-in packages'
                    }
                },
                required: []
            }
        );
        this.unityConnection = unityConnection;
    }

    async execute(params) {
        const { includeBuiltIn = false } = params;

        // Ensure connected
        if (!this.unityConnection.isConnected()) {
            await this.unityConnection.connect();
        }

        const result = await this.unityConnection.sendCommand('script_packages_list', {
            includeBuiltIn
        });

        return result;
    }
}
