import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ScriptPackagesListToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_packages_list',
            'List Unity packages in the project (optionally include built‑in). BEST PRACTICES: Use to discover available packages and their paths. Set includeBuiltIn=false to see only user packages. Returns package IDs, versions, and resolved paths. Embedded packages can be edited directly. Essential for understanding project dependencies.',
            {
                type: 'object',
                properties: {
                    includeBuiltIn: {
                        type: 'boolean',
                        default: false,
                        description: 'If true, includes built‑in packages in results.'
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
