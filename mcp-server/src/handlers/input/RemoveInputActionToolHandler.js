import { BaseToolHandler } from '../base/BaseToolHandler.js';
import {
    removeInputActionToolDefinition,
    removeInputActionHandler
} from '../../tools/input/inputActionsEditor.js';

export class RemoveInputActionToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      removeInputActionToolDefinition.name,
      removeInputActionToolDefinition.description,
      removeInputActionToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return removeInputActionHandler(this.unityConnection, args);
  }
}