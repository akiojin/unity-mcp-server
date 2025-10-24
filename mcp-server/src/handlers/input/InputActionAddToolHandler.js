import { BaseToolHandler } from '../base/BaseToolHandler.js';
import {
    addInputActionToolDefinition,
    addInputActionHandler
} from '../../tools/input/inputActionsEditor.js';

export class InputActionAddToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      addInputActionToolDefinition.name,
      addInputActionToolDefinition.description,
      addInputActionToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return addInputActionHandler(this.unityConnection, args);
  }
}
