import { BaseToolHandler } from '../base/BaseToolHandler.js';
import {
  addInputBindingToolDefinition,
  addInputBindingHandler
} from '../../tools/input/inputActionsEditor.js';

export class InputBindingAddToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      addInputBindingToolDefinition.name,
      addInputBindingToolDefinition.description,
      addInputBindingToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return addInputBindingHandler(this.unityConnection, args);
  }
}
