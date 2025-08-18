import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { 
    getInputActionsStateToolDefinition,
    analyzeInputActionsAssetToolDefinition,
    getInputActionsStateHandler,
    analyzeInputActionsAssetHandler
} from '../../tools/analysis/getInputActionsState.js';

export class GetInputActionsStateToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      getInputActionsStateToolDefinition.name,
      getInputActionsStateToolDefinition.description,
      getInputActionsStateToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return getInputActionsStateHandler(this.unityConnection, args);
  }
}

export class AnalyzeInputActionsAssetToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      analyzeInputActionsAssetToolDefinition.name,
      analyzeInputActionsAssetToolDefinition.description,
      analyzeInputActionsAssetToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return analyzeInputActionsAssetHandler(this.unityConnection, args);
  }
}