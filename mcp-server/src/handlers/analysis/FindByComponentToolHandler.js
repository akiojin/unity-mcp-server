import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { findByComponentToolDefinition, findByComponentHandler } from '../../tools/analysis/findByComponent.js';

/**
 * Handler for the analysis_component_find tool
 */
export class FindByComponentToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      findByComponentToolDefinition.name,
      findByComponentToolDefinition.description,
      findByComponentToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return findByComponentHandler(this.unityConnection, args);
  }
}
