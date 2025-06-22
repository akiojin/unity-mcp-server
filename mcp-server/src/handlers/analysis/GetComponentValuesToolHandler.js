import { BaseToolHandler } from '../BaseToolHandler.js';
import { getComponentValuesToolDefinition, getComponentValuesHandler } from '../../tools/analysis/getComponentValues.js';

/**
 * Handler for the get_component_values tool
 */
export class GetComponentValuesToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      getComponentValuesToolDefinition.name,
      getComponentValuesToolDefinition.description,
      getComponentValuesToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return getComponentValuesHandler(this.unityConnection, args);
  }
}