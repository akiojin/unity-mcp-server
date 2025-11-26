import { BaseToolHandler } from '../base/BaseToolHandler.js';
import {
  removeAllBindingsToolDefinition,
  removeAllBindingsHandler
} from '../../tools/input/inputActionsEditor.js';

export class InputBindingRemoveAllToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      removeAllBindingsToolDefinition.name,
      removeAllBindingsToolDefinition.description,
      removeAllBindingsToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return removeAllBindingsHandler(this.unityConnection, args);
  }
}
