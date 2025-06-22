import { BaseToolHandler } from '../BaseToolHandler.js';
import { getGameObjectDetailsToolDefinition, getGameObjectDetailsHandler } from '../../tools/analysis/getGameObjectDetails.js';

/**
 * Handler for get_gameobject_details tool
 */
export class GetGameObjectDetailsToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            getGameObjectDetailsToolDefinition.name,
            getGameObjectDetailsToolDefinition.description,
            getGameObjectDetailsToolDefinition.inputSchema
        );
        this.unityConnection = unityConnection;
        this.handler = getGameObjectDetailsHandler;
    }

    async execute(args) {
        // Check connection
        if (!this.unityConnection.isConnected()) {
            throw new Error('Unity connection not available');
        }

        // Use the handler function
        const result = await this.handler(this.unityConnection, args);
        
        // If the handler returns an error response, throw it
        if (result.isError) {
            throw new Error(result.content[0].text);
        }
        
        // Return the content
        return result;
    }
}