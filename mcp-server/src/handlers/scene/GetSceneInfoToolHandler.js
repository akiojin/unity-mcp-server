import { BaseToolHandler } from '../BaseToolHandler.js';
import { getSceneInfoToolDefinition, getSceneInfoHandler } from '../../tools/scene/getSceneInfo.js';

/**
 * Handler for get_scene_info tool
 */
export class GetSceneInfoToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            getSceneInfoToolDefinition.name,
            getSceneInfoToolDefinition.description,
            getSceneInfoToolDefinition.inputSchema
        );
        this.unityConnection = unityConnection;
    }

    async execute(args) {
        return getSceneInfoHandler(this.unityConnection, args);
    }
}