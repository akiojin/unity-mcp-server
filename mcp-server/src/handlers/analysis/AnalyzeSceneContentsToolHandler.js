import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { analyzeSceneContentsToolDefinition, analyzeSceneContentsHandler } from '../../tools/analysis/analyzeSceneContents.js';

/**
 * Handler for analyze_scene_contents tool
 */
export class AnalyzeSceneContentsToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            analyzeSceneContentsToolDefinition.name,
            analyzeSceneContentsToolDefinition.description,
            analyzeSceneContentsToolDefinition.inputSchema
        );
        this.unityConnection = unityConnection;
        this.handler = analyzeSceneContentsHandler;
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
