import { BaseToolHandler } from '../base/BaseToolHandler.js';
import {
    createCompositeBindingToolDefinition,
    createCompositeBindingHandler
} from '../../tools/input/inputActionsEditor.js';

export class InputBindingCompositeCreateToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      createCompositeBindingToolDefinition.name,
      createCompositeBindingToolDefinition.description,
      createCompositeBindingToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return createCompositeBindingHandler(this.unityConnection, args);
  }
}
