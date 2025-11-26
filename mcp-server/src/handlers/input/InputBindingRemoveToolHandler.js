import { BaseToolHandler } from '../base/BaseToolHandler.js';
import {
  removeInputBindingToolDefinition,
  removeInputBindingHandler
} from '../../tools/input/inputActionsEditor.js';

export class InputBindingRemoveToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      removeInputBindingToolDefinition.name,
      removeInputBindingToolDefinition.description,
      removeInputBindingToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return removeInputBindingHandler(this.unityConnection, args);
  }
}
